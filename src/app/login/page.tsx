"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setMsg(null);
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else window.location.href = "/";
    } catch {
      setMsg("لم يتم إعداد Supabase. استخدم وضع العرض التجريبي للاستكشاف.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md md:mt-20" lang="ar">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">مسار</h1>
        <p className="muted">لوحة تحكم المبيعات — دخول صاحب المتجر.</p>
      </div>

      <div className="card flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="email">البريد الإلكتروني</label>
          <input
            id="email"
            className="input"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@beyondstyle.ae"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">كلمة المرور</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={signIn} disabled={loading}>
          {loading ? "جارٍ الدخول…" : "دخول"}
        </button>
        {msg && <p className="text-sm text-red-700">{msg}</p>}

        <div className="flex items-center gap-2 py-1 text-xs text-gray-500">
          <span className="h-px flex-1 bg-gray-200" />
          <span>أو</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <Link href="/" className="btn btn-accent justify-center">
          دخول وضع العرض التجريبي
        </Link>
        <p className="text-center text-xs text-gray-500">
          وضع العرض يستخدم بيانات تجريبية — لا يحتاج إلى Supabase. اربط مشروع Supabase حقيقياً لتفعيل الدخول الإنتاجي.
        </p>
      </div>
    </div>
  );
}
