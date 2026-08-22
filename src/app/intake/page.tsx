"use client";
import { useState } from "react";
import AnalysisPanel from "@/components/AnalysisPanel";
import type { Language, Platform, ReplyContext } from "@/lib/types";

export default function IntakePage() {
  const [form, setForm] = useState({
    customerName: "",
    platform: "instagram" as Platform,
    language: "en" as Language,
    message: "",
    productShown: "",
    emirate: "",
    knownPrice: "",
    knownDelivery: "",
    stockAvailable: false,
    paymentStatus: "none",
    courierConfirmed: false,
    vatApplicable: false,
    notes: "",
  });
  const [imageData, setImageData] = useState<{ mimeType: string; dataBase64: string } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Privacy pre-check on the pasted message (§31 privacy warning).
  const privacyWarning =
    /(?:\+?971|0)\s?5\d/.test(form.message) ||
    /\b(villa|building|apartment|street|p\.?o\.?\s?box|makani)\b/i.test(form.message);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setImageData({ mimeType: file.type, dataBase64: b64 });
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    const context: ReplyContext = {
      language: form.language,
      customerNameDisplay: form.customerName || null,
      customerNameArabicVerified: null,
      emirate: form.emirate || null,
      quotedPrice: form.knownPrice ? Number(form.knownPrice) : null,
      quotedDeliveryCost: form.knownDelivery ? Number(form.knownDelivery) : null,
      vatApplicable: form.vatApplicable,
      paymentStatus: form.paymentStatus as any,
      courierConfirmed: form.courierConfirmed,
      stockKnownAvailable: form.stockAvailable,
      activeOffers: [],
      inventory: [],
    };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerMessage: form.message,
          context,
          images: imageData ? [imageData] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-semibold" lang="ar">محادثة جديدة</h1>
      <p className="mb-4 text-sm text-gray-500" lang="ar">
        الصق رسالة العميل والمعلومات المعروفة. يصيغ النظام رداً مقترحاً — تعتمده أنت قبل الإرسال.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="intake-name" className="label" lang="ar">اسم العميل</label>
              <input id="intake-name" className="input" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
            </div>
            <div>
              <label htmlFor="intake-platform" className="label" lang="ar">المنصة</label>
              <select id="intake-platform" className="input" value={form.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="tiktok">TikTok</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="comment">تعليق</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="intake-language" className="label" lang="ar">لغة الرسالة</label>
              <select id="intake-language" className="input" value={form.language} onChange={(e) => set("language", e.target.value as Language)}>
                <option value="en">English</option>
                <option value="ar">عربي</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>
            <div>
              <label htmlFor="intake-emirate" className="label" lang="ar">الإمارة (إن عُرفت)</label>
              <input id="intake-emirate" className="input" value={form.emirate} onChange={(e) => set("emirate", e.target.value)} placeholder="دبي / الشارقة / العين…" />
            </div>
          </div>

          <div>
            <label htmlFor="intake-message" className="label" lang="ar">رسالة العميل</label>
            <textarea id="intake-message" className="input min-h-[120px]" value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="الصق رسالة الواتساب أو الدايركت هنا…" />
            {privacyWarning && (
              <p className="mt-1 text-xs text-red-700" lang="ar">
                تبدو الرسالة تحتوي على رقم هاتف أو عنوان. لا تدرج البيانات الخاصة في أي رد علني.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="intake-product" className="label" lang="ar">المنتج / الإعلان المعروض (اختياري)</label>
            <input id="intake-product" className="input" value={form.productShown} onChange={(e) => set("productShown", e.target.value)} />
          </div>

          <div>
            <label htmlFor="intake-image" className="label" lang="ar">لقطة شاشة / صورة المنتج (اختياري)</label>
            <input id="intake-image" type="file" accept="image/*" onChange={onFile} className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="intake-price" className="label" lang="ar">السعر المعروف (د.إ)</label>
              <input id="intake-price" className="input" value={form.knownPrice} onChange={(e) => set("knownPrice", e.target.value)} />
            </div>
            <div>
              <label htmlFor="intake-delivery" className="label" lang="ar">تكلفة التوصيل المعروفة (د.إ)</label>
              <input id="intake-delivery" className="input" value={form.knownDelivery} onChange={(e) => set("knownDelivery", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2" lang="ar"><input type="checkbox" checked={form.stockAvailable} onChange={(e) => set("stockAvailable", e.target.checked)} /> المخزون متاح</label>
            <label className="flex items-center gap-2" lang="ar"><input type="checkbox" checked={form.courierConfirmed} onChange={(e) => set("courierConfirmed", e.target.checked)} /> تكلفة الشحن مؤكدة</label>
            <label className="flex items-center gap-2" lang="ar"><input type="checkbox" checked={form.vatApplicable} onChange={(e) => set("vatApplicable", e.target.checked)} /> ضريبة القيمة المضافة</label>
            <div>
              <label htmlFor="intake-payment" className="label" lang="ar">حالة الدفع</label>
              <select id="intake-payment" className="input" value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
                <option value="none">لا شيء</option>
                <option value="link_sent">تم إرسال الرابط</option>
                <option value="needs_verification">بانتظار التحقق</option>
                <option value="confirmed">مؤكد</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary self-start" onClick={analyze} disabled={loading || !form.message} lang="ar">
            {loading ? "جارٍ التحليل…" : "تحليل وصياغة الرد"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div>
          {result ? (
            <AnalysisPanel result={result} />
          ) : (
            <div className="card text-sm text-gray-500" lang="ar">
              بعد التحليل ستظهر هنا نتائج التحليل المنظم وفحوصات الضمانات والرد الجاهز للإرسال.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
