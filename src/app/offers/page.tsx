import { fetchRows, formatAed, formatDate } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle } from "@/components/ui";
import clsx from "clsx";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const { rows, demoMode } = await fetchRows("offers", { order: "end_at" });
  const now = Date.now();
  const active = rows.filter((r) => r.active && new Date(r.end_at as string).getTime() > now);
  const expired = rows.filter((r) => !r.active || new Date(r.end_at as string).getTime() <= now);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="العروض"
        subtitle="العروض النشطة تحكم ما يمكن للنظام اقتراحه. أي سعر خارج العرض النشط يتطلب موافقة صاحب العمل."
      />
      <DemoBanner demoMode={demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="عروض نشطة" value={active.length} />
        <Kpi label="منتهية" value={expired.length} />
        <Kpi label="متوسط السعر النشط" value={formatAed(active.length ? active.reduce((s, o) => s + (Number(o.price) || 0), 0) / active.length : 0)} />
        <Kpi label="توصيل مجاني دبي" value={active.filter((o) => o.delivery_rule === "free_dubai").length} />
      </div>

      <div className="card mb-4">
        <SectionTitle>العروض النشطة</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((o) => (
            <OfferCard key={o.id as string} o={o} />
          ))}
          {active.length === 0 && <p className="text-sm text-slate-500" lang="ar">لا عروض نشطة. النظام لا يستطيع اقتراح أسعار حتى يُحمَّل عرض.</p>}
        </div>
      </div>

      <div className="card">
        <SectionTitle>منتهية / غير نشطة</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {expired.map((o) => (
            <OfferCard key={o.id as string} o={o} muted />
          ))}
          {expired.length === 0 && <p className="text-sm text-slate-500" lang="ar">لا عروض سابقة.</p>}
        </div>
      </div>
    </div>
  );
}

function OfferCard({ o, muted }: { o: Record<string, unknown>; muted?: boolean }) {
  return (
    <div className={clsx("rounded-2xl border p-3", muted ? "border-gray-200 bg-gray-50 text-gray-600" : "border-amber-200 bg-amber-50/60")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{o.name as string}</span>
        <span className="text-sm font-semibold">{formatAed(Number(o.price))}</span>
      </div>
      <p className="mt-1 text-sm">{o.description as string}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <Item label="التوصيل" v={(o.delivery_rule as string).replace(/_/g, " ")} />
        <Item label="ضريبة القيمة المضافة" v={o.vat_rule as string} />
        <Item label="ينتهي" v={formatDate(o.end_at as string)} />
        <Item label="الحالة" v={o.active ? "نشط" : "غير نشط"} />
      </div>
      {Array.isArray(o.products_included) && o.products_included.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
          {(o.products_included as string[]).map((p) => <span key={p} className="badge badge-neutral">{p.replace(/_/g, " ")}</span>)}
        </div>
      )}
    </div>
  );
}

function Item({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg bg-white/60 px-2 py-1"><div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div><div>{v}</div></div>;
}
