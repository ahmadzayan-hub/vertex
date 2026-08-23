import type { AiAnalysisResult, Submission, Project } from '@/types';

import { mockAnalyze } from './mock';

// The browser-facing AI service ALWAYS routes production providers through
// the Supabase Edge Function so that API keys never touch the client bundle.
// For local development without an Edge Function, we use the deterministic
// mock provider so the whole upload -> findings -> approval flow works
// against nothing but Supabase Auth + Storage + tables.

export interface AnalyzeArgs {
  submission: Submission;
  project: Project;
}

const PROVIDER = (import.meta.env.VITE_AI_PROVIDER ?? 'mock') as
  | 'mock'
  | 'anthropic'
  | 'openai'
  | 'edge';

/**
 * Analyze a submission and return findings + score.
 *
 * mock                             -> deterministic client-side mock
 * anthropic | openai (dev only)    -> proxy through Edge Function
 * edge                             -> invoke Edge Function directly
 *
 * The Edge Function endpoint is `/functions/v1/analyze-submission`.
 */
export async function analyzeSubmission(
  { submission, project }: AnalyzeArgs
): Promise<AiAnalysisResult> {
  if (PROVIDER === 'mock') {
    // Give the UI a moment to show the "processing" state so the transition
    // is visible even on a fast machine.
    await new Promise((r) => setTimeout(r, 600));
    return mockAnalyze(submission, project);
  }

  // Real providers go through the Edge Function.
  const { supabase } = await import('@/utils/supabase');
  const { data, error } = await supabase.functions.invoke<AiAnalysisResult>('analyze-submission', {
    body: { submission_id: submission.id, provider: PROVIDER },
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty analysis response');
  return data;
}

export { PROMPT_VERSION } from './prompts';
