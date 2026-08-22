"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  LayoutDashboard, MessageSquarePlus, Inbox, Users, ShoppingBag,
  CreditCard, Truck, Package, Tag, Factory, Star, BarChart3,
  Plug, Settings, FileText, Shield, Menu, X, ChevronRight,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

export interface NavBadges {
  inbox: number;
  payments: number;
  disputes: number;
  attention: number;
}

const NAV = [
  { href: "/",             label: "لوحة التحكم",        group: "التشغيل",  Icon: LayoutDashboard,   badgeKey: "attention" as keyof NavBadges },
  { href: "/intake",       label: "محادثة جديدة",        group: "التشغيل",  Icon: MessageSquarePlus  },
  { href: "/inbox",        label: "صندوق الوارد",        group: "التشغيل",  Icon: Inbox,             badgeKey: "inbox"     as keyof NavBadges },
  { href: "/customers",    label: "العملاء",             group: "السجلات",  Icon: Users              },
  { href: "/orders",       label: "الطلبات",             group: "السجلات",  Icon: ShoppingBag        },
  { href: "/payments",     label: "المدفوعات",           group: "السجلات",  Icon: CreditCard,        badgeKey: "payments"  as keyof NavBadges },
  { href: "/couriers",     label: "الشحن والتوصيل",      group: "السجلات",  Icon: Truck              },
  { href: "/inventory",    label: "المخزون",             group: "السجلات",  Icon: Package            },
  { href: "/offers",       label: "العروض",              group: "السجلات",  Icon: Tag                },
  { href: "/suppliers",    label: "الموردون",            group: "السجلات",  Icon: Factory            },
  { href: "/reviews",      label: "التقييمات",           group: "السجلات",  Icon: Star               },
  { href: "/reports",      label: "التقارير",            group: "التحليلات", Icon: BarChart3         },
  { href: "/integrations", label: "التكاملات",           group: "الإدارة",  Icon: Plug               },
  { href: "/settings",     label: "الإعدادات",           group: "الإدارة",  Icon: Settings           },
  { href: "/prompts",      label: "إدارة الردود الآلية", group: "الإدارة",  Icon: FileText           },
  { href: "/audit",        label: "سجل المراجعة",        group: "الإدارة",  Icon: Shield             },
] as const;

const DEFAULT_BADGES: NavBadges = { inbox: 0, payments: 0, disputes: 0, attention: 0 };

export default function Nav({ mobile, badges = DEFAULT_BADGES }: { mobile?: boolean; badges?: NavBadges }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (mobile) {
    return (
      <div className="md:hidden">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900" dir="rtl" lang="ar">مسار</div>
            <div className="text-[11px] text-slate-500">لوحة تحكم المبيعات</div>
          </div>
          <div className="flex items-center gap-2">
            {badges.attention > 0 && (
              <span className="badge badge-vip">{badges.attention}</span>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <NavList pathname={pathname} onNav={() => setOpen(false)} badges={badges} compact />
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className="sidebar flex h-full flex-col">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
        <LogoMark size={34} variant="amber" className="shrink-0" />
        <div>
          <div className="text-sm font-bold text-white tracking-tight" dir="rtl" lang="ar">مسار</div>
          <div className="text-[11px] text-slate-500">لوحة تحكم المبيعات</div>
        </div>
      </Link>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <NavList pathname={pathname} badges={badges} />
      </div>

      {/* Footer callout */}
      <div className="m-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3" dir="rtl" lang="ar">
        <div className="text-xs font-semibold text-amber-400">الذكاء يصيغ — أنت تعتمد</div>
        <div className="mt-1 text-[11px] text-slate-500">
          كل رد يمر عبر ضوابط حماية. صاحب العمل يوافق على كل ما يخص المال والتوصيل والشكاوى.
        </div>
      </div>
    </nav>
  );
}

function NavList({
  pathname, onNav, badges, compact,
}: {
  pathname: string;
  onNav?: () => void;
  badges: NavBadges;
  compact?: boolean;
}) {
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
    <div className="flex flex-col gap-1">
      {groups.map((g) => (
        <div key={g} className="mb-1">
          <div className={compact ? "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400" : "sidebar-group-label"}>
            {g}
          </div>
          {NAV.filter((n) => n.group === g).map((n) => {
            const active = pathname === n.href;
            const count = "badgeKey" in n && n.badgeKey ? badges[n.badgeKey] : 0;
            const { Icon } = n;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onNav}
                className={clsx(
                  compact
                    ? "flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors"
                    : "sidebar-item",
                  active
                    ? compact
                      ? "bg-amber-50 text-amber-700 font-medium"
                      : "sidebar-item-active font-medium"
                    : compact
                      ? "text-slate-700 hover:bg-slate-50"
                      : ""
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon size={15} className={clsx("shrink-0", active ? (compact ? "text-amber-600" : "text-amber-400") : (compact ? "text-slate-400" : "text-slate-600"))} />
                  <span className="truncate">{n.label}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {count > 0 && (
                    <span className={clsx(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      active ? (compact ? "bg-amber-100 text-amber-800" : "bg-amber-400/20 text-amber-300") : "bg-slate-100 text-slate-600"
                    )}>
                      {count}
                    </span>
                  )}
                  {active && !compact && <ChevronRight size={12} className="text-amber-400/60" />}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
