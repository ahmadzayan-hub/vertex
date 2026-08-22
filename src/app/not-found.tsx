import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      <LogoMark size={56} variant="amber" />
      <div>
        <div className="text-6xl font-bold text-slate-200 select-none">٤٠٤</div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">الصفحة غير موجودة</h1>
        <p className="muted mt-1">
          الصفحة التي تبحث عنها لم تُعثر عليها أو تم نقلها.
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Page not found</p>
      </div>
      <Link href="/" className="btn btn-accent gap-2">
        <Home size={15} />
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}
