import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { attempts, stationResults } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const attemptId = Number(id);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return Response.json({ ok: false, error: "رقم المحاولة غير صحيح" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { certificateName?: unknown; durationSec?: unknown };
    const certificateName =
      typeof body.certificateName === "string" ? body.certificateName.trim().slice(0, 80) : null;
    const durationRaw = Number(body.durationSec);
    const durationSec = Number.isFinite(durationRaw) ? Math.max(0, Math.round(durationRaw)) : null;

    await ensureSchema();

    const [agg] = await db
      .select({
        score: sql<number>`coalesce(sum(${stationResults.points}), 0)::int`,
        done: sql<number>`count(*)::int`,
      })
      .from(stationResults)
      .where(eq(stationResults.attemptId, attemptId));

    const [updated] = await db
      .update(attempts)
      .set({
        completedAt: new Date(),
        durationSec,
        certificateName: certificateName || null,
        score: Number(agg?.score ?? 0),
        stationsDone: Number(agg?.done ?? 0),
      })
      .where(eq(attempts.id, attemptId))
      .returning();

    if (!updated) {
      return Response.json({ ok: false, error: "المحاولة غير موجودة" }, { status: 404 });
    }

    return Response.json({ ok: true, score: updated.score, maxScore: updated.maxScore });
  } catch (error) {
    console.error("[attempts/complete]", error);
    return Response.json({ ok: false, error: "تعذر إكمال المحاولة" }, { status: 500 });
  }
}
