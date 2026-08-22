import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/ui";
import { getNotebookLmStatus } from "@/lib/integrations/notebooklm-session";
import { DEFAULT_NOTEBOOKLM_SCOPES } from "@/lib/integrations/notebooklm";

export const dynamic = "force-dynamic";
export const metadata = { title: "التكاملات" };

const STATUS_BANNER: Record<string, { tone: "ok" | "warn" | "err"; text: string }> = {
  connected: { tone: "ok", text: "تم ربط NotebookLM. يمكن للنظام الآن التصرف عبر حساب Google الخاص بك." },
  disconnected: { tone: "warn", text: "تم قطع اتصال NotebookLM. تم إلغاء الرموز ومسحها." },
  denied: { tone: "warn", text: "تم إلغاء التفويض — لم يُمنح أي وصول." },
  state_mismatch: { tone: "err", text: "فشل التحقق الأمني (تعارض الحالة). يرجى إعادة المحاولة." },
  exchange_failed: { tone: "err", text: "تعذّر استبدال رمز التفويض. تحقق من بيانات الاعتماد وعنوان إعادة التوجيه." },
  not_configured: { tone: "err", text: "لم يتم تهيئة OAuth لـ NotebookLM على الخادم. اضبط متغيرات GOOGLE_OAUTH_*." },
  error: { tone: "err", text: "حدث خطأ أثناء التفويض. يرجى المحاولة مرة أخرى." },
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notebooklm?: string }>;
}) {
  const status = await getNotebookLmStatus();
  const { notebooklm } = await searchParams;
  const banner = notebooklm ? STATUS_BANNER[notebooklm] : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="التكاملات"
        subtitle="ربط الحسابات الخارجية التي يمكن للنظام التصرف عبرها. رموز OAuth مشفّرة ومخزّنة httpOnly — لا تُكشف للمتصفح أبداً."
      />

      {banner && (
        <div
          className={
            "mb-4 rounded-2xl border p-3 text-sm " +
            (banner.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-900"
              : banner.tone === "warn"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-900")
          }
        >
          {banner.text}
        </div>
      )}

      <div className="card">
        <SectionTitle
          action={
            <span
              className={
                "badge " +
                (status.connected ? "badge-pass" : status.configured ? "badge-warn" : "badge-neutral")
              }
            >
              {status.connected ? "متصل" : status.configured ? "غير متصل" : "غير مُهيَّأ"}
            </span>
          }
        >
          NotebookLM (Google)
        </SectionTitle>

        <p className="text-sm text-gray-600" lang="ar">
          فوّض النظام للوصول إلى NotebookLM عبر Google OAuth 2.0. يُستخدم لقراءة مصادر الدفاتر من Google Drive وإثراء بحث العملاء. نطلب وصولاً دون اتصال لضمان استمرار الاتصال دون إعادة مطالبة.
        </p>

        <dl className="mt-3 grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
          <Row k="المزوّد" v="Google OAuth 2.0 (authorization code)" />
          <Row
            k="الصلاحيات"
            v={(status.scopes.length ? status.scopes : DEFAULT_NOTEBOOKLM_SCOPES)
              .map(shortScope)
              .join(", ")}
          />
          {status.connected && status.expiresAt && (
            <Row k="انتهاء رمز الوصول" v={new Date(status.expiresAt).toLocaleString("ar-AE")} />
          )}
          <Row k="تخزين الرموز" v="مشفّر، httpOnly cookie (AES-256-GCM)" />
        </dl>

        {!status.configured && (
          <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-500" lang="ar">
            اضبط <code>GOOGLE_OAUTH_CLIENT_ID</code> و<code>GOOGLE_OAUTH_CLIENT_SECRET</code> و(اختياري) <code>GOOGLE_OAUTH_REDIRECT_URI</code> على الخادم ثم أعد التحميل. راجع <code>.env.example</code>.
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {status.connected ? (
            <>
              <Link href="/api/integrations/notebooklm/authorize" className="btn btn-ghost">
                إعادة الاتصال
              </Link>
              <form method="post" action="/api/integrations/notebooklm/disconnect">
                <button type="submit" className="btn btn-ghost text-red-700">
                  قطع الاتصال
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/api/integrations/notebooklm/authorize"
              className={"btn btn-primary" + (status.configured ? "" : " pointer-events-none opacity-50")}
              aria-disabled={!status.configured}
            >
              ربط NotebookLM
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-44 shrink-0 text-gray-500">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}

// Trim long Google scope URLs to a readable tail (e.g. drive.readonly).
function shortScope(scope: string): string {
  if (!scope.startsWith("http")) return scope;
  const tail = scope.split("/auth/")[1] ?? scope;
  return tail;
}
