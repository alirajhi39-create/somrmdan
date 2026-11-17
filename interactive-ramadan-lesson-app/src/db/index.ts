import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * ترتيب الأولوية:
 * 1) NEON_DATABASE_URL — قاعدة Neon أون لاين (المضبوطة في .env / إعدادات Vercel)
 * 2) DATABASE_URL / POSTGRES_URL ... — المتغيرات التي يضيفها تكامل Neon على Vercel تلقائيًا، أو القاعدة المحلية
 */
function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "postgres" ||
    host === "db"
  );
}

function parseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * توحيد إعدادات SSL لروابط Neon (sslmode=require) حتى لا تُصدر مكتبة pg تحذيرات
 * وتبقى على السلوك الآمن (verify-full).
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (isLocalHost(u.hostname)) return url;
    const mode = u.searchParams.get("sslmode");
    if (!u.searchParams.has("uselibpqcompat") && (mode === "require" || mode === "prefer" || mode === "verify-ca")) {
      u.searchParams.set("sslmode", "verify-full");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

const rawUrl = resolveDatabaseUrl();
const host = parseHost(rawUrl);
const isRemote = Boolean(host && !isLocalHost(host));
const databaseUrl = rawUrl ? normalizeUrl(rawUrl) : undefined;

export const dbInfo = {
  configured: Boolean(rawUrl),
  host,
  provider: !host ? "none" : host.endsWith("neon.tech") ? "neon" : isLocalHost(host) ? "local" : "postgres",
  source: process.env.NEON_DATABASE_URL
    ? "NEON_DATABASE_URL"
    : process.env.DATABASE_URL
      ? "DATABASE_URL"
      : process.env.POSTGRES_URL
        ? "POSTGRES_URL"
        : rawUrl
          ? "env"
          : null,
} as const;

if (!rawUrl) {
  console.warn(
    "[db] لم يتم ضبط NEON_DATABASE_URL أو DATABASE_URL — اربط قاعدة Neon من لوحة Vercel (Storage → Neon) أو أضف المتغير يدويًا.",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __ramadanPgPool?: Pool;
};

export const pool =
  globalForDb.__ramadanPgPool ??
  new Pool({
    connectionString: databaseUrl,
    // القواعد السحابية تتطلب SSL (إن لم يحدده الرابط)، أما المحلية فلا.
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ramadanPgPool = pool;
}

export const db = drizzle(pool);
