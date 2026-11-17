import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * يدعم المتغيرات التي يضيفها تكامل Neon على Vercel تلقائيًا
 * (DATABASE_URL / POSTGRES_URL / ...) بالإضافة إلى قاعدة البيانات المحلية.
 */
function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL
  );
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host === "postgres" ||
      host === "db"
    );
  } catch {
    return false;
  }
}

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.warn(
    "[db] لم يتم ضبط DATABASE_URL — اربط قاعدة Neon من لوحة Vercel (Storage → Neon) أو أضف المتغير يدويًا.",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __ramadanPgPool?: Pool;
};

export const pool =
  globalForDb.__ramadanPgPool ??
  new Pool({
    connectionString: databaseUrl,
    // القواعد السحابية (Neon وغيرها) تتطلب SSL، أما المحلية فلا.
    ssl: databaseUrl && !isLocalUrl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ramadanPgPool = pool;
}

export const db = drizzle(pool);
