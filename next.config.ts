import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Domaines autorisés pour l'optimiseur d'images : sans liste fermée, /_next/image
    // servirait de proxy ouvert vers n'importe quel site.
    remotePatterns: [
      // Cloudflare R2 / S3 — CDN public
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "cdn.afromix.io" },
      // Visuels de démonstration de la base
      { protocol: "https", hostname: "images.unsplash.com" },
      // CDN configuré par l'environnement (STORAGE_CDN_URL)
      ...(process.env.STORAGE_CDN_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.STORAGE_CDN_URL).hostname }]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24h
  },
  devIndicators: false,
  // Le service worker doit toujours être relu à jour, sinon une nouvelle version
  // mettrait jusqu'à 24 h à atteindre les applications installées
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
