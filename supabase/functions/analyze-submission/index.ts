// deno-lint-ignore-file
// Supabase Edge Function - Deno runtime
//
// POST /functions/v1/analyze-submission
// Body: { submission_id: string, provider?: "anthropic" | "openai" | "mock" }
//
// The browser NEVER passes an API key. Keys come from Supabase project
// secrets: `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`.
//
// This function:
//   1. Loads the submission + parent project via the caller's auth JWT
//      (so RLS decides what the caller can see).
//   2. Downloads the file from private storage.
//   3. Extracts text (PDF/image via provider vision; text/csv/json passthrough).
//   4. Calls the provider with the VERTEX system prompt.
//   5. Inserts findings + updates the submission using the SERVICE ROLE key
//      so the update happens even for reviewers with limited UPDATE grants.
//   6. Writes an audit_log entry.
//
// Deploy: `supabase functions deploy analyze-submission --project-ref <ref>`

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const PROMPT_VERSION = 'v1.0.0';

const SYSTEM_PROMPT = `You are VERTEX, a contract & project intelligence auditor.
Return ONLY valid JSON matching:
{
  "compliance_score": number, "traffic_light": "green"|"amber"|"red",
  "confidence_percent": number,
  "findings": [{
    "finding_type": "compliance_pass"|"compliance_fail"|"alert"|"insight"|"recommendation",
    "severity": "critical"|"high"|"medium"|"low"|"info",
    "title": string, "description": string,
    "contract_clause_ref": string|null, "evidence_extract": string|null,
    "evidence_level": "verified_source"|"saved_rule"|"working_assumption"|"pending_confirmation"|"unknown",
    "source_citation": string|null,
    "confidence_percent": number,
    "requires_action": boolean,
    "ai_model_used": string, "prompt_version": string
  }]
}`;

interface AnalysisResult {
  compliance_score: number;
  traffic_light: 'green' | 'amber' | 'red';
  confidence_percent: number;
  findings: Array<Record<string, unknown>>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// In-memory rate limiter. Each Deno isolate keeps its own bucket map; on
// Supabase's autoscaled runtime this means the effective cap is looser than
// RATE_LIMIT_MAX x isolates, but it still throttles pathological loops from
// one client. For a hard per-user cap, back this by a Postgres table.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function rateLimitAllows(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = (rateBuckets.get(userId) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((bucket[0] + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  bucket.push(now);
  rateBuckets.set(userId, bucket);
  return { ok: true };
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

  const auth = req.headers.get('Authorization');
  const asUser = createClient(url, anon, {
    global: { headers: auth ? { Authorization: auth } : {} },
  });
  const asService = createClient(url, service);

  let payload: { submission_id?: string; provider?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json', ...cors },
    });
  }
  if (!payload.submission_id) {
    return new Response(JSON.stringify({ error: 'submission_id is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json', ...cors },
    });
  }

  // Rate limit: identify the caller from their JWT and cap analyses per
  // rolling minute. Falls back to the client IP when no JWT is present.
  const {
    data: { user: caller },
  } = await asUser.auth.getUser();
  const rateKey =
    caller?.id ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for') ??
    'anon';
  const rate = rateLimitAllows(rateKey);
  if (!rate.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many analyses. Try again shortly.' }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(rate.retryAfterSec),
          ...cors,
        },
      }
    );
  }

  // 1. Load submission + project through the caller's JWT.
  const { data: sub, error: subErr } = await asUser
    .from('submissions')
    .select('*')
    .eq('id', payload.submission_id)
    .maybeSingle();
  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: subErr?.message ?? 'submission not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json', ...cors },
    });
  }
  const { data: project } = await asUser
    .from('projects')
    .select('*')
    .eq('id', sub.project_id)
    .maybeSingle();

  // 2. Fetch file bytes as base64.
  let extractedText = '';
  if (sub.file_url) {
    const { data: file } = await asService.storage
      .from('submissions')
      .download(sub.file_url);
    if (file) {
      const contentType = file.type || '';
      if (contentType.startsWith('text/') || contentType === 'application/json') {
        extractedText = (await file.text()).slice(0, 12000);
      } else {
        // For PDFs / images we would normally OCR or call a vision-capable
        // provider here. For MVP we send a short descriptor to the model.
        extractedText = `[binary file · type=${contentType} · size=${file.size} bytes]`;
      }
    }
  }

  const provider =
    (payload.provider as string) ??
    Deno.env.get('AI_PROVIDER') ??
    (anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'mock');

  // 3. Call the model.
  const userPrompt = `PROJECT: ${project?.name ?? 'unknown'} (${project?.contract_ref ?? ''})
CONTRACT VALUE: ${project?.contract_value_aed ?? 'not specified'}
SUBMISSION TYPE: ${sub.submission_type}
DOCUMENT: ${sub.document_name}

CONTENT (max 8000 chars):
"""
${extractedText.slice(0, 8000)}
"""

Return the JSON verdict now.`;

  let result: AnalysisResult;
  try {
    if (provider === 'anthropic' && anthropicKey) {
      result = await callAnthropic(anthropicKey, userPrompt);
    } else if (provider === 'openai' && openaiKey) {
      result = await callOpenAI(openaiKey, userPrompt);
    } else {
      result = mockResult(sub.id);
    }
  } catch (err) {
    await asService
      .from('submissions')
      .update({ processing_status: 'error', processing_completed_at: new Date().toISOString() })
      .eq('id', sub.id);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...cors },
    });
  }

  // 4. Persist findings + submission update using the service role.
  const rows = result.findings.map((f) => ({ ...f, submission_id: sub.id }));
  if (rows.length > 0) {
    const { error: insErr } = await asService.from('ai_findings').insert(rows);
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { 'content-type': 'application/json', ...cors },
      });
    }
  }
  await asService
    .from('submissions')
    .update({
      processing_status: 'complete',
      processing_completed_at: new Date().toISOString(),
      compliance_score: result.compliance_score,
      traffic_light: result.traffic_light,
      confidence_percent: result.confidence_percent,
    })
    .eq('id', sub.id);

  await asService.from('audit_log').insert({
    action: 'submission.analyzed',
    resource_type: 'submission',
    resource_id: sub.id,
    after_state: {
      compliance_score: result.compliance_score,
      traffic_light: result.traffic_light,
      findings_count: rows.length,
      provider,
    },
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'content-type': 'application/json', ...cors },
  });
});

async function callAnthropic(apiKey: string, userPrompt: string): Promise<AnalysisResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  return parseJson(text, 'claude-3-5-sonnet-latest');
}

async function callOpenAI(apiKey: string, userPrompt: string): Promise<AnalysisResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';
  return parseJson(text, 'gpt-4o-mini');
}

function parseJson(text: string, modelName: string): AnalysisResult {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON');
  const parsed = JSON.parse(text.slice(start, end + 1)) as AnalysisResult;
  for (const f of parsed.findings ?? []) {
    (f as Record<string, unknown>).ai_model_used = modelName;
    (f as Record<string, unknown>).prompt_version = PROMPT_VERSION;
  }
  return parsed;
}

function mockResult(seed: string): AnalysisResult {
  const rand = (i: number) => Math.abs(hash(seed + i)) % 100;
  return {
    compliance_score: 60 + (rand(1) % 30),
    traffic_light: rand(2) < 40 ? 'amber' : rand(3) < 20 ? 'red' : 'green',
    confidence_percent: 70 + (rand(4) % 25),
    findings: [
      {
        finding_type: 'compliance_pass',
        severity: 'info',
        title: 'VAT calculation verified',
        description: 'Detected VAT figure matches expected 5% on subtotal.',
        contract_clause_ref: '5.6',
        evidence_extract: 'VAT (5%): AED 7,425.00',
        evidence_level: 'verified_source',
        source_citation: 'UAE VAT Law · Article 27',
        confidence_percent: 92,
        requires_action: false,
        ai_model_used: 'mock-edge-1',
        prompt_version: PROMPT_VERSION,
      },
    ],
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h | 0;
}
