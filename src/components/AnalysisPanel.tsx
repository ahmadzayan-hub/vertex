"use client";
import { useState } from "react";
import clsx from "clsx";
import type { AnalysisOutput, GuardrailResult } from "@/lib/types";

interface Result {
  analysis: AnalysisOutput;
  guardrails: GuardrailResult;
  provider: string;
  model: string;
}

const STATUS_LABEL: Record<string, string> = { pass: "ناجح", warn: "تحذير", fail: "فشل" };

function StatusBadge({ status }: { status: "pass" | "warn" | "fail" }) {
  return (
    <span className={clsx("badge", `badge-${status}`)}>{STATUS_LABEL[status] ?? status}</span>
  );
}

export default function AnalysisPanel({ result }: { result: Result }) {
  const { analysis, guardrails } = result;
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);

  const reply = guardrails.revisedReply ?? analysis.best_reply_to_send;
  const canSend = guardrails.worstStatus !== "fail";

  return (
    <div className="flex flex-col gap-4">
      {guardrails.requiresHumanApproval && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" lang="ar">
          يلزم موافقة صاحب المتجر قبل الإرسال. راجع نتائج الضمانات أدناه.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold" lang="ar">تحليل المحادثة</h3>
          <dl className="grid grid-cols-1 gap-1 text-sm">
            <Row k="النية" v={analysis.customer_intent} />
            <Row k="درجة الحرارة" v={analysis.lead_temperature} />
            <Row k="شخصية العميل" v={analysis.customer_persona} />
            <Row k="المنتج" v={analysis.product_identified} />
            <Row k="فحص الاسم" v={analysis.name_check} />
            <Row k="الاسم بالعربي" v={analysis.correct_arabic_name ?? "—"} />
            <Row k="معلومات ناقصة" v={analysis.missing_information.join(", ") || "—"} />
            <Row k="الإجراء التالي" v={analysis.next_action} />
            <Row k="توقيت المتابعة" v={analysis.follow_up_timing} />
            <Row k="الثقة" v={`${Math.round(analysis.confidence_score * 100)}%`} />
          </dl>
          {analysis.risk_or_caution.length > 0 && (
            <div className="mt-2 text-xs text-red-700" lang="ar">
              تنبيه: {analysis.risk_or_caution.join(" · ")}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {result.provider} / {result.model}
          </p>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold" lang="ar">الضمانات</h3>
            <StatusBadge status={guardrails.worstStatus} />
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {guardrails.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <StatusBadge status={f.status} />
                <span className="text-gray-700">
                  <span className="font-medium">{f.code}</span>: {f.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" lang="ar">
            الرد المقترح {guardrails.revisedReply && "(بعد التصحيح التلقائي)"}
          </h3>
          <button
            className="btn btn-ghost"
            lang="ar"
            onClick={() => {
              navigator.clipboard.writeText(reply);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm">{reply}</p>
        <p className="mt-2 text-xs text-gray-500" lang="ar">ملاحظة داخلية: {analysis.internal_sales_note}</p>

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={!canSend}
            onClick={() => setApproved(true)}
            className={clsx("btn", canSend ? "btn-primary" : "btn-ghost cursor-not-allowed opacity-50")}
            lang="ar"
          >
            {approved ? "تم الاعتماد" : "اعتماد وإرسال"}
          </button>
          {!canSend && (
            <span className="text-xs text-red-700" lang="ar">
              محظور بسبب ضمانة فاشلة — صحّح الرد قبل الاعتماد.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-gray-500">{k}</dt>
      <dd className="text-gray-900">{v}</dd>
    </div>
  );
}
