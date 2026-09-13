import type { MetadataRoute } from "next";

/**
 * 管理画面と計測エンドポイントは index させない。
 * 公開していない古い案件のページは存在しない（notFound）ので、個別の指定は不要 (D-004)。
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"]
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined
  };
}
