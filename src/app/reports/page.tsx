import { fetchKpis, fetchRows, formatAed } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle, Stat } from "@/components/ui";
import { OrdersBarChart, RevenueAreaChart, FunnelBarChart, TopProductsChart } from "@/components/LazyCharts";
import { revenueByDay, ordersByDay, conversionFunnel, topProducts } from "@/lib/analytics";
import { buildVatCsv, type OrderForTax } from "@/lib/growth";
import { computeDailyMetrics, deterministicNarrative } from "@/lib/daily-review";
import VatExportButton from "./VatExportButton";

export const dynamic = "force-dynamic";

const WEEKLY_SECTIONS = [
  "أفضل المنتجات مبيعاً", "أفضل الألوان مبيعاً", "أفضل نصوص التحويل",
  "أسوأ نصوص التحويل", "مراجعة مستوى خدمة الشحن", "مراجعة مخاطر الموردين",
  "توصية بالتسعير", "توصية بإعادة طلب المخزون",
  "توصية بالمحتوى", "خطة الشراء المتكرر",
];

export default async function ReportsPage() {
  const [{ kpis, demoMode }, ordersRes, convsRes] = await Promise.all([
    fetchKpis(),
    fetchRows("orders", { order: "created_at" }),
    fetchRows("conversations", { order: "created_at" }),
  ]);
  const orders = ordersRes.rows as Array<Record<string, unknown> & { created_at: string }>;
  const conversations = convsRes.rows as Array<Record<string, unknown> & { created_at: string }>;

  const revenue = revenueByDay(orders, 30);
  const ordersTrend = ordersByDay(orders, 30);
  const funnel = conversionFunnel(conversations, orders);
  const top = topProducts(orders);
  const metrics = computeDailyMetrics(orders, conversations);
  const narrative = deterministicNarrative(metrics);
  const csv = buildVatCsv(
    orders
      .filter((o) => o.payment_status === "confirmed")
      .map((o) => ({
        id: o.id as string,
        created_at: o.created_at,
        product_summary: o.product_summary as string,
        product_price: Number(o.product_price),
        delivery_cost: Number(o.delivery_cost),
        vat_amount: Number(o.vat_amount),
        total_amount: Number(o.total_amount),
        payment_status: o.payment_status as string,
      })) as OrderForTax[]
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="التقارير"
        subtitle="دورة التحسين. استخدم المراجعة اليومية كل مساء والمراجعة الأسبوعية كل أسبوع — بدونها يتكرر الخطأ بشكل أسرع."
        action={<VatExportButton csv={csv} />}
      />
      <DemoBanner demoMode={demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="إيراد 30 يوم" value={formatAed(kpis.revenueAed30d)} />
        <Kpi label="إيراد 7 أيام" value={formatAed(kpis.revenueAed7d)} />
        <Kpi label="طلبات مدفوعة" value={kpis.paidOrders} />
        <Kpi label="تحويل إلى دفع" value={`${kpis.leadToPayment}%`} />
        <Kpi label="نزاعات مفتوحة" value={kpis.openDisputes} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <SectionTitle>الإيراد (30 يوم)</SectionTitle>
          <RevenueAreaChart data={revenue} />
        </div>
        <div className="card">
          <SectionTitle>قمع التحويل</SectionTitle>
          <FunnelBarChart data={funnel} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <SectionTitle>الطلبات اليومية</SectionTitle>
          <OrdersBarChart data={ordersTrend} />
        </div>
        <div className="card">
          <SectionTitle>أفضل المنتجات (مدفوع)</SectionTitle>
          <TopProductsChart data={top} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <SectionTitle action={<span className="muted text-xs" lang="ar">اليوم، مباشر</span>}>
            المراجعة اليومية
          </SectionTitle>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Stat label="محادثات"         value={metrics.todayConversations} />
            <Stat label="عملاء ساخنون"    value={metrics.todayHotLeads} />
            <Stat label="طلبات"           value={metrics.todayOrders} />
            <Stat label="مدفوع (د.إ)"     value={formatAed(metrics.todayPaidAed)} />
            <Stat label="معلق (د.إ)"      value={formatAed(metrics.todayPendingAed)} />
            <Stat label="متوسط الطلب (د.إ)" value={formatAed(metrics.avgOrderAed)} />
            <Stat label="نسبة التحويل"    value={`${metrics.conversionPercent}%`} />
            <Stat label="شكاوى"           value={metrics.todayComplaints} />
          </div>
          <h3 className="h2 mt-3 mb-1">السرد — English</h3>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{narrative.en}</pre>
          <h3 className="h2 mt-3 mb-1">السرد — العربية</h3>
          <pre className="rtl whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700" dir="rtl">{narrative.ar}</pre>
          <p className="mt-2 text-xs text-slate-500" lang="ar">
            اربط مزوّد الذكاء الاصطناعي (الإعدادات) لصياغة هذا السرد كل مساء من محادثات اليوم.
          </p>
        </div>
        <div className="card">
          <SectionTitle>دورة التحسين الأسبوعية</SectionTitle>
          <ul className="list-disc pr-5 text-sm text-slate-700 space-y-1" dir="rtl" lang="ar">
            {WEEKLY_SECTIONS.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="mt-3 text-xs text-slate-500" lang="ar">
            تُنجز كل أحد. ملف CSV الجاهز للضريبة أعلاه يُغذّي التقرير الشهري.
          </p>
        </div>
      </div>
    </div>
  );
}

