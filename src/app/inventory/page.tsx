import { fetchRows } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle } from "@/components/ui";
import { computeVelocity } from "@/lib/growth";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ok: "badge-pass",
  low: "badge-warn",
  critical: "badge-fail",
  out: "badge-fail",
};
const STATUS_LABEL: Record<string, string> = {
  ok: "متاح", low: "منخفض", critical: "حرج", out: "نفد",
};

export default async function InventoryPage() {
  const { rows, demoMode } = await fetchRows("inventory", { order: "last_updated" });
  const velocityById = new Map(rows.map((r) => [
    r.id as string,
    computeVelocity({
      quantityAvailable: Number(r.quantity_available) || 0,
      dailySalesRate: Number(r.daily_sales_rate) || 0,
      reorderLeadDays: Number(r.reorder_lead_days) || 7,
    }),
  ]));

  const totals = rows.reduce(
    (acc: { units: number; out: number; critical: number; low: number }, r) => {
      acc.units += Number(r.quantity_available) || 0;
      const v = velocityById.get(r.id as string)!;
      if (v.status === "out") acc.out += 1;
      else if (v.status === "critical") acc.critical += 1;
      else if (v.status === "low") acc.low += 1;
      return acc;
    },
    { units: 0, out: 0, critical: 0, low: 0 }
  );

  const reorderList = rows.filter((r) => velocityById.get(r.id as string)!.reorderSuggested);
  // Group by product for readability.
  const byProduct = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = (r.product_name as string) ?? "Other";
    if (!byProduct.has(k)) byProduct.set(k, []);
    byProduct.get(k)!.push(r);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="المخزون" subtitle="المخزون الحالي حسب اللون والنوع مع اقتراحات إعادة الطلب بناء على معدل المبيعات." />
      <DemoBanner demoMode={demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="إجمالي الوحدات" value={totals.units} />
        <Kpi label="نفدت من المخزون" value={totals.out} />
        <Kpi label="حرج (أقل من نصف المهلة)" value={totals.critical} />
        <Kpi label="منخفض (أقل من ضعف المهلة)" value={totals.low} />
      </div>

      {/* Reorder queue */}
      {reorderList.length > 0 && (
        <div className="card mb-4">
          <SectionTitle>قائمة إعادة الطلب ({reorderList.length})</SectionTitle>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>المنتج</th><th>اللون/النوع</th><th>المتاح</th><th>الأيام المتبقية</th><th>الكمية المقترحة</th><th>المورّد</th></tr></thead>
              <tbody>
                {reorderList.map((r) => {
                  const v = velocityById.get(r.id as string)!;
                  return (
                  <tr key={r.id as string}>
                    <td className="font-medium">{r.product_name as string}</td>
                    <td>{r.colour as string} <span className="text-xs text-gray-400">{(r.finish as string).replace("_", "-")}</span></td>
                    <td>{Number(r.quantity_available)}</td>
                    <td>{v.daysToStockout ?? "—"}</td>
                    <td className="font-medium">{v.suggestedReorderQty}</td>
                    <td className="text-xs text-gray-500">{(r.supplier_source as string) ?? "—"}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-product grid */}
      {Array.from(byProduct.entries()).map(([product, list]) => (
        <div key={product} className="card mb-4">
          <SectionTitle action={<span className="muted text-xs">{list.length} SKUs</span>}>
            {product}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-3">
            {list.map((r) => {
              const v = velocityById.get(r.id as string)!;
              return (
              <div key={r.id as string} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{r.colour as string}</span>
                  <span className={clsx("badge", STATUS_BADGE[v.status])} lang="ar">{STATUS_LABEL[v.status] ?? v.status}</span>
                </div>
                <div className="text-xs text-gray-500">{(r.finish as string).replace("_", "-")} · {v.label}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="font-semibold">{Number(r.quantity_available)}</div><div className="text-gray-500" lang="ar">متاح</div></div>
                  <div><div className="font-semibold">{Number(r.quantity_reserved)}</div><div className="text-gray-500" lang="ar">محجوز</div></div>
                  <div><div className="font-semibold">{Number(r.quantity_delivered)}</div><div className="text-gray-500" lang="ar">موصّل</div></div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
