import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which loads a separate worker file at
  // runtime. Bundling it breaks that worker lookup, so load it via native
  // require instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
