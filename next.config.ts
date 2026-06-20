/** @format */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v2 memuat pdfjs-dist & @napi-rs/canvas (modul native);
  // jangan dibundel agar berjalan benar di server.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
