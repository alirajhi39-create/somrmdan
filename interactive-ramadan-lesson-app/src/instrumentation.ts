/**
 * يُنفَّذ مرة واحدة عند إقلاع الخادم (محليًا وعلى Vercel):
 * ينشئ جداول قاعدة البيانات تلقائيًا إن لم تكن موجودة.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureSchema } = await import("@/db/ensure-schema");
      await ensureSchema();
      console.log("[db] schema ready ✔");
    } catch (error) {
      console.error("[db] schema init failed (سيُعاد المحاولة عند أول طلب):", error instanceof Error ? error.message : error);
    }
  }
}
