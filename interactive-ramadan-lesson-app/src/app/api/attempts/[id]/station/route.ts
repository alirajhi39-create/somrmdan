import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { attempts, stationResults } from "@/db/schema";
import { STATIONS } from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

function toInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const attemptId = Number(id);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return Response.json({ ok: false, error: "رقم المحاولة غير صحيح" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const stationIndex = toInt(body.stationIndex, -1);
    const station = STATIONS[stationIndex];
    if (!station) {
      return Response.json({ ok: false, error: "رقم المحطة غير صحيح" }, { status: 400 });
    }

    const tries = Math.max(1, toInt(body.tries, 1));
    const points = Math.min(station.maxPoints, Math.max(0, toInt(body.points, 0)));
    const timeSec = Math.max(0, toInt(body.timeSec, 0));
    const correct = typeof body.correct === "boolean" ? body.correct : tries === 1;

    await ensureSchema();

    const [attempt] = await db.select({ id: attempts.id }).from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if (!attempt) {
      return Response.json({ ok: false, error: "المحاولة غير موجودة" }, { status: 404 });
    }

    await db
      .insert(stationResults)
      .values({
        attemptId,
        stationIndex,
        stationKey: station.key,
        stationTitle: station.title,
        correct,
        tries,
        points,
        maxPoints: station.maxPoints,
        timeSec,
      })
      .onConflictDoUpdate({
        target: [stationResults.attemptId, stationResults.stationIndex],
        set: { correct, tries, points, maxPoints: station.maxPoints, timeSec, answeredAt: new Date() },
      });

    const [agg] = await db
      .select({
        score: sql<number>`coalesce(sum(${stationResults.points}), 0)::int`,
        done: sql<number>`count(*)::int`,
      })
      .from(stationResults)
      .where(eq(stationResults.attemptId, attemptId));

    await db
      .update(attempts)
      .set({ score: Number(agg?.score ?? 0), stationsDone: Number(agg?.done ?? 0) })
      .where(eq(attempts.id, attemptId));

    return Response.json({ ok: true, score: Number(agg?.score ?? 0), stationsDone: Number(agg?.done ?? 0) });
  } catch (error) {
    console.error("[attempts/station]", error);
    return Response.json({ ok: false, error: "تعذر حفظ نتيجة المحطة" }, { status: 500 });
  }
}
