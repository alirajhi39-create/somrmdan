import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { FALLBACK_DATABASE_URL } from "./default-connection";

/**
 * ترتيب الأولوية:
 * 1) NEON_DATABASE_URL — قاعدة Neon أون لاين (في .env أو إعدادات Vercel)
 * 2) DATABASE_URL / POSTGRES_URL ... — المتغيرات التي يضيفها تكامل Neon على Vercel تلقائيًا، أو القاعدة المحلية
 * 3) الرابط الاحتياطي المدمج (default-connection.ts) حتى يعمل التطبيق بلا أي إعداد
 */
function isTruthy(value: string | undefined): boolean {
  return Boolean(value) && ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function resolveDatabaseUrl(): { url: string; source: string } {
  const explicitNeon = process.env.NEON_DATABASE_URL?.trim();
  if (explicitNeon) return { url: explicitNeon, source: "NEON_DATABASE_URL" };

  const candidates: Array<[string, string | undefined]> = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
    ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
  ];
  const configured = candidates.filter((c): c is [string, string] => Boolean(c[1] && c[1].trim().length > 0));

  // أي رابط سحابي مضبوط صراحةً (مثل تكامل Neon على Vercel) له الأولوية
  const remote = configured.find(([, value]) => {
    const h = parseHost(value.trim());
    return Boolean(h && !isLocalHost(h));
  });
  if (remote) return { url: remote[1].trim(), source: remote[0] };

  // رابط محلي فقط: يُستخدم عند طلب ذلك صراحةً (PREFER_LOCAL_DB=true)، وإلا نستخدم قاعدة Neon أون لاين
  const local = configured[0];
  if (local && isTruthy(process.env.PREFER_LOCAL_DB)) return { url: local[1].trim(), source: `${local[0]} (local)` };

  return { url: FALLBACK_DATABASE_URL, source: "fallback" };
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

function parseHost(url: string): string | null {
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

const resolved = resolveDatabaseUrl();
const host = parseHost(resolved.url);
const isRemote = Boolean(host && !isLocalHost(host));
const databaseUrl = normalizeUrl(resolved.url);

export const dbInfo = {
  configured: true,
  host,
  provider: !host ? "none" : host.endsWith("neon.tech") ? "neon" : isLocalHost(host) ? "local" : "postgres",
  source: resolved.source,
} as const;

if (resolved.source === "fallback") {
  console.info("[db] يتم استخدام قاعدة Neon أون لاين المدمجة (اضبط NEON_DATABASE_URL لتغييرها، أو PREFER_LOCAL_DB=true لاستخدام القاعدة المحلية).");
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
    connectionTimeoutMillis: 20_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ramadanPgPool = pool;
}

export const db = drizzle(pool);
