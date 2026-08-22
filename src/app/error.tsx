"use client";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
        <span className="text-2xl font-bold text-red-600">!</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">حدث خطأ غير متوقع</h1>
        <p className="muted mt-1">{error.message || "يرجى المحاولة مجدداً."}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-slate-400">ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary gap-2" onClick={reset}>
          <RotateCcw size={14} />
          إعادة المحاولة
        </button>
        <Link href="/" className="btn btn-ghost gap-2">
          <Home size={14} />
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
