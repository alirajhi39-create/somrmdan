import type { NextConfig } from "next";

/**
 * تثبيت رابط قاعدة البيانات من ملف .env وقت البناء حتى يبقى متاحًا وقت التشغيل
 * على Vercel حتى لو لم تُضبط متغيرات البيئة في اللوحة.
 */
const inlinedEnv: Record<string, string> = {};
if (process.env.NEON_DATABASE_URL) {
  inlinedEnv.NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
}

const nextConfig: NextConfig = {
  env: inlinedEnv,
};

export default nextConfig;
