"use client";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("pwa-dismissed")) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !prompt) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setPrompt(null); setVisible(false); }
  }

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="تثبيت تطبيق مسار"
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 z-50 flex items-center gap-3 rounded-2xl
                 bg-slate-900 p-3.5 shadow-2xl ring-1 ring-white/10
                 md:left-auto md:w-80 animate-in slide-in-from-bottom-4 duration-300"
    >
      <LogoMark size={40} variant="amber" className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">حمّل تطبيق مسار</p>
        <p className="text-[11px] text-slate-400 mt-0.5">وصول سريع من شاشتك الرئيسية</p>
      </div>
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2
                   text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shrink-0"
        aria-label="تثبيت التطبيق"
      >
        <Download size={13} />
        تثبيت
      </button>
      <button
        onClick={dismiss}
        className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>
    </div>
  );
}
