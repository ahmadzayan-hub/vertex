import { fetchRows, formatAed, formatDate } from "@/lib/data";
import { DemoBanner, PageHeader, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const PROVIDER = process.env.AI_PROVIDER ?? "mock";
const MODEL =
  PROVIDER === "anthropic" ? (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6") :
  PROVIDER === "openai" ? (process.env.OPENAI_MODEL ?? "gpt-4o") :
  PROVIDER === "groq" ? (process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile") :
  PROVIDER === "together" ? (process.env.TOGETHER_MODEL ?? "Qwen/Qwen2.5-72B-Instruct-Turbo") :
  PROVIDER === "gemini" ? (process.env.GEMINI_MODEL ?? "gemini-1.5-pro") :
  "mock (no live calls)";

export default async function SettingsPage() {
  const [settingsRes, productsRes] = await Promise.all([
    fetchRows("settings", { order: "key" }),
    fetchRows("products", { order: "name" }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="الإعدادات" subtitle="كل ما يؤثر على التسعير وضريبة القيمة المضافة ونوافذ الحجز والذكاء الاصطناعي قابل للتهيئة. لا شيء مُثبَّت في الكود." />
      <DemoBanner demoMode={settingsRes.demoMode} />

      <div className="card mb-4">
        <SectionTitle>مزوّد الذكاء الاصطناعي</SectionTitle>
        <dl className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
          <Row k="المزوّد" v={PROVIDER} />
          <Row k="النموذج" v={MODEL} />
          <Row k="مصفوفة الموافقة" v="14 إجراءً محظوراً من الموافقة التلقائية" />
          <Row k="وضع المحاكاة" v="رد آمن عند غياب مفتاح API" />
        </dl>
        <p className="mt-2 text-xs text-gray-500" lang="ar">
          غيّر المزوّد بضبط <code>AI_PROVIDER</code> (إحدى القيم: <code>openai</code>, <code>anthropic</code>, <code>gemini</code>, <code>groq</code>, <code>together</code>, <code>openai_compatible</code>) مع مفتاح API المناسب على الخادم.
        </p>
      </div>

      <div className="card mb-4">
        <SectionTitle>إعدادات النظام</SectionTitle>
        {settingsRes.rows.length === 0 ? (
          <p className="text-sm text-gray-500" lang="ar">لا توجد إعدادات بعد.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>المفتاح</th><th>القيمة</th><th>آخر تحديث</th></tr></thead>
            <tbody>
              {settingsRes.rows.map((s) => (
                <tr key={s.key as string}>
                  <td className="font-mono text-xs">{s.key as string}</td>
                  <td>{prettyValue(s.key as string, s.value)}</td>
                  <td className="text-xs text-gray-500">{formatDate(s.updated_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <SectionTitle>كتالوج المنتجات</SectionTitle>
        <table className="tbl">
          <thead><tr><th>المنتج</th><th>الفئة</th><th>السعر الافتراضي</th><th>ملاحظات</th><th>نشط</th></tr></thead>
          <tbody>
            {productsRes.rows.map((p) => (
              <tr key={p.id as string}>
                <td className="font-medium">{p.name as string}</td>
                <td className="text-xs text-gray-500">{(p.category as string).replace(/_/g, " ")}</td>
                <td>{formatAed(Number(p.default_price))}</td>
                <td className="text-xs text-gray-500">{(p.claim_notes as string) ?? "—"}</td>
                <td lang="ar">{p.active ? "نعم" : "لا"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (<div className="flex gap-2"><dt className="w-44 shrink-0 text-gray-500">{k}</dt><dd>{v}</dd></div>);
}

function prettyValue(key: string, value: unknown): string {
  if (typeof value === "number" && /aed|threshold/i.test(key)) return formatAed(value);
  if (typeof value === "number" && /rate|percent/.test(key)) return `${value}%`;
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
