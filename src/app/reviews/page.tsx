import { fetchRows, formatRelative } from "@/lib/data";
import { DemoBanner, PageHeader, Kpi, SectionTitle } from "@/components/ui";
import { selectTestimonials, type ReviewLike } from "@/lib/growth";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { rows, demoMode } = await fetchRows("reviews", { order: "created_at" });

  const total = rows.length;
  const avg = total ? (rows.reduce((s, r) => s + (Number(r.rating) || 0), 0) / total) : 0;
  const fiveStar = rows.filter((r) => Number(r.rating) === 5).length;
  const sharable = rows.filter((r) => r.permission_to_share).length;
  const stories = rows.filter((r) => r.story_mention).length;

  const testimonials = selectTestimonials(rows as unknown as ReviewLike[], 6);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="التقييمات"
        subtitle="آراء ما بعد البيع ودورة الشراء المتكرر. استخدم تقييماً فقط بإذن صريح من العميل — لا تشارك أي تعليق دون موافقة."
      />
      <DemoBanner demoMode={demoMode} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="متوسط التقييم" value={avg.toFixed(2)} hint={`${total} تقييم`} />
        <Kpi label="تقييمات 5 نجوم" value={fiveStar} />
        <Kpi label="مأذون بالمشاركة" value={sharable} hint="استخدمها على السوشيال ميديا" />
        <Kpi label="ذُكر في ستوري" value={stories} />
      </div>

      <div className="card mb-4">
        <SectionTitle>شهادات قابلة للمشاركة</SectionTitle>
        {testimonials.length === 0 ? (
          <p className="text-sm text-slate-500" lang="ar">لا توجد شهادات مأذون بمشاركتها.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {testimonials.map((t) => (
              <div key={t.id as string} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
                <div className="text-xs text-amber-700">{"★".repeat(Number(t.rating) || 0)}</div>
                <p className="mt-1 text-gray-800">“{t.feedback}”</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <SectionTitle>جميع التقييمات</SectionTitle>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>التقييم</th><th>العميل</th><th>التعليق</th><th>مشاركة</th><th>ستوري</th><th>الوقت</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id as string}>
                  <td>{"★".repeat(Number(r.rating) || 0)}</td>
                  <td>{r.customer_name as string}</td>
                  <td className="max-w-[28rem] truncate">{r.feedback as string}</td>
                  <td>{r.permission_to_share ? "✓" : "—"}</td>
                  <td>{r.story_mention ? "✓" : "—"}</td>
                  <td className="text-xs text-gray-500">{formatRelative(r.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
