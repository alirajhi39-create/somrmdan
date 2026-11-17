import { ensureSchema } from "@/db/ensure-schema";
import { getState } from "@/lib/competition-service";

export const dynamic = "force-dynamic";

/** عام: حالة المسابقة (للسبورة وأجهزة الطلاب) */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const playerIdRaw = new URL(req.url).searchParams.get("playerId");
  const playerId = playerIdRaw && /^\d+$/.test(playerIdRaw) ? Number(playerIdRaw) : undefined;
  try {
    await ensureSchema();
    const state = await getState(code.trim(), playerId);
    if (!state) return Response.json({ ok: false, error: "لا توجد مسابقة بهذا الرمز" }, { status: 404 });
    return Response.json({ ok: true, state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[competitions state]", error);
    return Response.json({ ok: false, error: "تعذر تحميل حالة المسابقة" }, { status: 500 });
  }
}
