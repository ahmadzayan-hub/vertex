import { fetchRows, formatAed, formatRelative } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle } from "@/components/ui";
import clsx from "clsx";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customersRes, ordersRes] = await Promise.all([
    fetchRows("customers", { order: "created_at" }),
    fetchRows("orders"),
  ]);

  const customers = customersRes.rows;
  const orders = ordersRes.rows;

  type Stats = { totalAed: number; orders: number; lastOrderAt?: string };
  const stats = new Map<string, Stats>();
  for (const o of orders) {
    const cid = o.customer_id as string;
    const s = stats.get(cid) ?? { totalAed: 0, orders: 0 };
    if (o.payment_status === "confirmed") s.totalAed += Number(o.total_amount) || 0;
    s.orders += 1;
    const at = o.created_at as string;
    if (!s.lastOrderAt || at > s.lastOrderAt) s.lastOrderAt = at;
    stats.set(cid, s);
  }

  const totalSpend = Array.from(stats.values()).reduce((s, x) => s + x.totalAed, 0);
  const vipCount = customers.filter((c) => c.vip).length;
  const repeatCount = customers.filter((c) => Number(c.purchase_count ?? 0) >= 2).length;
  const arabicShare = Math.round(
    (customers.filter((c) => c.language === "ar" || c.language === "mixed").length /
      Math.max(1, customers.length)) * 100
  );

  const enriched = customers
    .slice()
    .sort((a, b) => (stats.get(b.id as string)?.totalAed ?? 0) - (stats.get(a.id as string)?.totalAed ?? 0));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="العملاء" subtitle="سجلات المبيعات فقط — لا تنميط حساس أبداً." />
      <DemoBanner demoMode={customersRes.demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="إجمالي العملاء" value={customers.length} />
        <Kpi label="VIP" value={vipCount} hint="3 مشتريات فأكثر — توصيل مباشر" />
        <Kpi label="متكررون" value={repeatCount} hint="مشترتان فأكثر" />
        <Kpi label="ناطقون بالعربية" value={`${arabicShare}%`} hint="يشمل اللغة المختلطة" />
      </div>

      <div className="card">
        <SectionTitle action={<span className="muted" lang="ar">إجمالي الإنفاق: <strong>{formatAed(totalSpend)}</strong></span>}>
          قائمة العملاء
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>الاسم</th><th>الاسم بالعربي</th><th>المنصة</th><th>اللغة</th>
                <th>الشريحة</th><th>الطلبات</th><th>الإنفاق (د.إ)</th><th>آخر نشاط</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((c) => {
                const s = stats.get(c.id as string) ?? { totalAed: 0, orders: 0 } as Stats;
                return (
                <tr key={c.id as string}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name_display as string}</span>
                      {c.vip ? <span className="badge badge-vip">VIP</span> : null}
                      {!c.vip && Number(c.purchase_count) >= 2 ? <span className="badge badge-info" lang="ar">متكرر</span> : null}
                    </div>
                  </td>
                  <td className="rtl">{(c.name_arabic_verified as string) ?? "—"}</td>
                  <td>{c.platform as string}</td>
                  <td><span className={clsx("badge", c.language === "ar" ? "badge-info" : c.language === "mixed" ? "badge-warn" : "badge-neutral")}>{c.language as string}</span></td>
                  <td>{c.segment as string}</td>
                  <td>{s.orders}</td>
                  <td>{formatAed(s.totalAed)}</td>
                  <td className="text-xs text-gray-500">{s.lastOrderAt ? formatRelative(s.lastOrderAt) : "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
