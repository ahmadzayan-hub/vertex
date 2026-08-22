import { fetchKpis, fetchRows, formatAed, formatRelative } from "@/lib/data";
import { DemoBanner, Kpi, PageHeader, SectionTitle, OrderStatusPill, TempPill } from "@/components/ui";
import {
  RevenueAreaChart, StackedStatusChart, FunnelBarChart, TopProductsChart, PlatformPie,
} from "@/components/LazyCharts";
import {
  revenueByDay, stackedStatusByDay, conversionFunnel, topProducts, platformMix,
  buildAttentionQueue,
} from "@/lib/analytics";
import Link from "next/link";
import clsx from "clsx";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [{ kpis, demoMode }, ordersRes, convsRes, paymentsRes, disputesRes, inventoryRes, reviewsRes] =
    await Promise.all([
      fetchKpis(),
      fetchRows("orders", { order: "created_at" }),
      fetchRows("conversations", { order: "created_at" }),
      fetchRows("payments", { order: "created_at" }),
      fetchRows("disputes", { order: "created_at" }),
      fetchRows("inventory", { order: "last_updated" }),
      fetchRows("reviews", { order: "created_at", limit: 4 }),
    ]);

  const orders = ordersRes.rows as Array<Record<string, unknown> & { created_at: string }>;
  const conversations = convsRes.rows as Array<Record<string, unknown> & { created_at: string }>;
  const revenueSeries = revenueByDay(orders);
  const statusSeries = stackedStatusByDay(orders);
  const funnel = conversionFunnel(conversations, orders);
  const top = topProducts(orders);
  const platforms = platformMix(conversations);
  const attention = buildAttentionQueue({
    orders,
    payments: paymentsRes.rows,
    disputes: disputesRes.rows,
    inventory: inventoryRes.rows,
    conversations,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="لوحة التحكم"
        subtitle="الإيراد والمدفوعات وحالة التوصيل — تتحدث عند كل تحميل."
        action={
          <Link href="/intake" className="btn btn-accent">+ محادثة جديدة</Link>
        }
      />
      <DemoBanner demoMode={demoMode} />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="إيراد اليوم (د.إ)" value={formatAed(kpis.revenueAedToday)} hint="الطلبات المدفوعة فقط" />
        <Kpi label="إيراد آخر 7 أيام" value={formatAed(kpis.revenueAed7d)} hint={`30 يوم: ${formatAed(kpis.revenueAed30d)}`} />
        <Kpi label="بانتظار الدفع" value={formatAed(kpis.pendingPaymentAed)} hint={`${kpis.paymentLinksSent} رابط دفع`} />
        <Kpi label="نزاعات مفتوحة" value={kpis.openDisputes} hint={kpis.openDisputes ? "الشحن متوقف حتى الحل" : "لا نزاعات"} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="عملاء ساخنون" value={kpis.hotLeads} />
        <Kpi label="جدد اليوم" value={kpis.newToday} />
        <Kpi label="استفسارات سعر" value={kpis.priceInquiries} />
        <Kpi label="تم التوصيل" value={kpis.deliveredOrders} />
        <Kpi label="تحويل إلى دفع" value={`${kpis.leadToPayment}%`} />
      </div>

      {/* Revenue + Attention queue */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <SectionTitle action={<span className="muted">14 يوماً (د.إ)</span>}>
            منحنى الإيراد
          </SectionTitle>
          <RevenueAreaChart data={revenueSeries} />
        </div>
        <div className="card">
          <SectionTitle action={<Link className="muted text-xs underline" href="/inbox">صندوق الوارد →</Link>}>
            يحتاج اهتمامك
          </SectionTitle>
          {attention.length === 0 ? (
            <p className="text-sm text-slate-500" lang="ar">لا تنبيهات الآن — كل شيء مرتب</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {attention.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex items-start gap-2 rounded-lg p-2 hover:bg-gray-50">
                    <span className={clsx(
                      "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
                      a.severity === "high" ? "bg-red-500" : a.severity === "medium" ? "bg-amber-500" : "bg-sky-500"
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      <div className="truncate text-xs text-gray-500">{a.detail}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status + Funnel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <SectionTitle>حالة الطلبات (14 يوم)</SectionTitle>
          <StackedStatusChart data={statusSeries} />
        </div>
        <div className="card">
          <SectionTitle>قمع التحويل</SectionTitle>
          <FunnelBarChart data={funnel} />
        </div>
      </div>

      {/* Top products + Platform mix */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <SectionTitle action={<Link href="/inventory" className="muted text-xs underline">المخزون →</Link>}>
            أفضل المنتجات (طلبات مدفوعة)
          </SectionTitle>
          <TopProductsChart data={top} />
        </div>
        <div className="card">
          <SectionTitle>مصادر العملاء</SectionTitle>
          <PlatformPie data={platforms} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <SectionTitle action={<Link href="/orders" className="muted text-xs underline">كل الطلبات →</Link>}>
            آخر الطلبات
          </SectionTitle>
          <table className="tbl">
            <thead><tr><th>الطلب</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th><th>الدفع</th><th>الوقت</th></tr></thead>
            <tbody>
              {orders.slice(0, 7).map((o) => (
                <tr key={o.id as string}>
                  <td className="font-medium">{o.product_summary as string}</td>
                  <td>{o.customer_name as string}</td>
                  <td>{formatAed(Number(o.total_amount))}</td>
                  <td><OrderStatusPill status={o.order_status as string} /></td>
                  <td><span className="text-xs text-gray-500">{(o.payment_status as string).replace(/_/g, " ")}</span></td>
                  <td className="text-xs text-gray-500">{formatRelative(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <SectionTitle action={<Link href="/reviews" className="muted text-xs underline">الكل →</Link>}>
            أحدث التقييمات
          </SectionTitle>
          <ul className="flex flex-col gap-3">
            {(reviewsRes.rows as Array<Record<string, unknown>>).slice(0, 4).map((r) => (
              <li key={r.id as string} className="border-l-2 border-amber-300 pl-3">
                <div className="text-xs text-gray-500">
                  {"★".repeat(Number(r.rating) || 0)}{" "}
                  <span className="text-gray-400">·</span>{" "}
                  {r.customer_name as string}
                </div>
                <p className="mt-0.5 text-sm">{r.feedback as string}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Latest conversations */}
      <div className="mt-4 card">
        <SectionTitle action={<Link href="/inbox" className="muted text-xs underline">صندوق الوارد →</Link>}>
          آخر المحادثات
        </SectionTitle>
        <ul className="flex flex-col">
          {conversations.slice(0, 6).map((c) => (
            <li key={c.id as string} className="flex items-start gap-3 border-t border-gray-100 py-2 first:border-t-0">
              <TempPill temp={c.lead_temperature as string} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">
                    {(c as Record<string, unknown>).customer_name as string} · <span className="text-gray-500">{c.platform as string}</span>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                </div>
                <p className={clsx(
                  "truncate text-sm text-gray-700",
                  c.message_language === "ar" && "rtl"
                )}>{c.message_text as string}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
