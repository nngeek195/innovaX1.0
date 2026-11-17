import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/judge-dashboard", "/api/"],
      },
    ],
    sitemap: "https://innovax.cschaptersusl.org/sitemap.xml",
  };
}
