import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/api/", "/login"],
      },
    ],
    sitemap: "https://desktop-tutorial.vercel.app/sitemap.xml",
  };
}
