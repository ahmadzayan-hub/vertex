import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import PwaRegister from "@/components/PwaRegister";
import PwaInstall from "@/components/PwaInstall";
import { fetchRows, fetchKpis } from "@/lib/data";

async function getNavBadges() {
  try {
    const [{ kpis }, payments] = await Promise.all([
      fetchKpis(),
      fetchRows("payments", { where: { status: "needs_verification" } }),
    ]);
    return {
      inbox: kpis.hotLeads,
      payments: payments.rows.length,
      disputes: kpis.openDisputes,
      attention: kpis.hotLeads + payments.rows.length + kpis.openDisputes,
    };
  } catch {
    return { inbox: 0, payments: 0, disputes: 0, attention: 0 };
  }
}

const APP_URL = "https://desktop-tutorial.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "مسار — لوحة تحكم المبيعات",
    template: "%s · مسار",
  },
  description:
    "لوحة تحكم متكاملة لإدارة طلبات التجارة الاجتماعية في الإمارات. تتبع كل طلب من أول رسالة حتى التسليم والمراجعة.",
  applicationName: "مسار",
  authors: [{ name: "Beyond Connect General Trading L.L.C." }],
  keywords: [
    "مسار", "Masaar", "إدارة طلبات", "تجارة اجتماعية", "الإمارات",
    "UAE social commerce", "order management", "sales dashboard",
    "Beyond Style UAE", "CRM UAE",
  ],
  manifest: "/manifest.json",
  openGraph: {
    title: "مسار — لوحة تحكم المبيعات",
    description: "إدارة متكاملة لطلبات التجارة الاجتماعية — من أول رسالة حتى التسليم والمدفوعات.",
    type: "website",
    locale: "ar_AE",
    alternateLocale: "en_AE",
    siteName: "مسار",
  },
  twitter: {
    card: "summary",
    title: "مسار — لوحة تحكم المبيعات",
    description: "إدارة متكاملة لطلبات التجارة الاجتماعية في الإمارات.",
  },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "مسار",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#020617" },
  ],
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "مسار",
  alternateName: "Masaar",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: "لوحة تحكم متكاملة لإدارة طلبات التجارة الاجتماعية في الإمارات",
  author: { "@type": "Organization", name: "Beyond Connect General Trading L.L.C." },
  inLanguage: ["ar", "en"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const badges = await getNavBadges();
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="مسار" />
      </head>
      <body>
        {/* Skip navigation — first focusable element, hidden until focused */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          lang="ar"
        >
          انتقل إلى المحتوى الرئيسي
        </a>

        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar — LTR layout so sidebar always on left */}
          <aside
            dir="ltr"
            className="hidden w-64 shrink-0 md:flex md:flex-col overflow-y-auto"
          >
            <Nav badges={badges} />
          </aside>

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden" dir="ltr">
            {/* Mobile header */}
            <div className="md:hidden px-4 pt-4 pb-2">
              <Nav mobile badges={badges} />
            </div>

            <main id="main-content" className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
              {children}
            </main>
          </div>
        </div>

        <PwaRegister />
        <PwaInstall />
      </body>
    </html>
  );
}
