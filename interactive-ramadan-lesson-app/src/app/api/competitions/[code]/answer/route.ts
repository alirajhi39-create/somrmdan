import { ensureSchema } from "@/db/ensure-schema";
import { CompetitionError, submitAnswer } from "@/lib/competition-service";

export const dynamic = "force-dynamic";

/** عام: إرسال إجابة طالب على السؤال الحالي */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as { playerId?: unknown; optionIndex?: unknown };
  const playerId = Number(body.playerId);
  const optionIndex = Number(body.optionIndex);
  if (!Number.isInteger(playerId) || playerId <= 0 || !Number.isInteger(optionIndex)) {
    return Response.json({ ok: false, error: "بيانات غير صحيحة" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const result = await submitAnswer(code.trim(), playerId, optionIndex);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof CompetitionError ? error.status : 500;
    if (status === 500) console.error("[competitions answer]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "تعذر إرسال الإجابة" }, { status });
  }
}
