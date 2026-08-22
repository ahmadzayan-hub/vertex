import { fetchRows, formatAed } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle } from "@/components/ui";
import clsx from "clsx";

export const dynamic = "force-dynamic";

function riskBadge(score: number) {
  if (score < 0.25) return { cls: "badge-pass", label: "منخفضة" };
  if (score < 0.5) return { cls: "badge-info", label: "متوسطة" };
  if (score < 0.7) return { cls: "badge-warn", label: "عالية" };
  return { cls: "badge-fail", label: "محظور" };
}

export default async function SuppliersPage() {
  const { rows, demoMode } = await fetchRows("suppliers", { order: "risk_score" });
  const sorted = [...rows].sort((a, b) => (Number(a.risk_score) || 0) - (Number(b.risk_score) || 0));
  const approved = rows.filter((r) => r.sample_approved && r.real_video_received).length;
  const holding = rows.filter((r) => !r.sample_approved || !r.real_video_received).length;
  const avgUnit = rows.reduce((s, r) => s + (Number(r.unit_cost) || 0), 0) / Math.max(1, rows.length);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="الموردون"
        subtitle="لا شراء بالجملة بدون فيديو حقيقي وعينة معتمدة. درجة المخاطرة تحكم التصعيد."
      />
      <DemoBanner demoMode={demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="الموردون" value={rows.length} />
        <Kpi label="معتمدون كاملاً" value={approved} hint="فيديو + عينة معتمدة" />
        <Kpi label="معلقون" value={holding} hint="فيديو أو عينة ناقصة" />
        <Kpi label="متوسط تكلفة الوحدة" value={formatAed(avgUnit)} />
      </div>

      <div className="card">
        <SectionTitle>القائمة والمخاطر</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((s) => {
            const risk = riskBadge(Number(s.risk_score) || 0);
            return (
              <div key={s.id as string} className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name as string}</span>
                  <span className={clsx("badge", risk.cls)}>{risk.label}</span>
                </div>
                <div className="text-xs text-gray-500">{(s.country as string)} · {(s.platform as string)} · MOQ {s.moq as number}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <Cell label="تكلفة الوحدة" v={formatAed(Number(s.unit_cost))} />
                  <Cell label="الشحن" v={formatAed(Number(s.shipping_cost))} />
                  <Cell label="الإنتاج" v={s.production_time as string} />
                  <Cell label="العينة" v={s.sample_status as string} />
                  <Cell label="فيديو حقيقي" v={(s.real_video_received as boolean) ? "نعم" : "غير متوفر"} highlight={!s.real_video_received} />
                  <Cell label="إثبات المواد" v={s.material_proof as string} highlight={(s.material_proof as string) === "missing"} />
                </div>
                {s.notes ? <p className="mt-2 text-xs italic text-gray-500">{s.notes as string}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-lg bg-gray-50 px-2 py-1", highlight && "bg-red-50 text-red-700")}>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div>{v}</div>
    </div>
  );
}
