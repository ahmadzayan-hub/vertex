import type { MetadataRoute } from "next";

const BASE = "https://desktop-tutorial.vercel.app";

const ROUTES = [
  { url: "/",            priority: 1.0, changeFrequency: "always" as const },
  { url: "/inbox",       priority: 0.9, changeFrequency: "always" as const },
  { url: "/orders",      priority: 0.9, changeFrequency: "always" as const },
  { url: "/payments",    priority: 0.9, changeFrequency: "always" as const },
  { url: "/customers",   priority: 0.8, changeFrequency: "daily"  as const },
  { url: "/couriers",    priority: 0.7, changeFrequency: "daily"  as const },
  { url: "/inventory",   priority: 0.7, changeFrequency: "daily"  as const },
  { url: "/reviews",     priority: 0.7, changeFrequency: "daily"  as const },
  { url: "/offers",      priority: 0.6, changeFrequency: "weekly" as const },
  { url: "/suppliers",   priority: 0.6, changeFrequency: "weekly" as const },
  { url: "/reports",     priority: 0.8, changeFrequency: "daily"  as const },
  { url: "/integrations",priority: 0.5, changeFrequency: "monthly" as const },
  { url: "/settings",    priority: 0.4, changeFrequency: "monthly" as const },
  { url: "/audit",       priority: 0.4, changeFrequency: "weekly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({
    url: `${BASE}${r.url}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
