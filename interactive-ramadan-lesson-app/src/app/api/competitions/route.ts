import { ensureSchema } from "@/db/ensure-schema";
import { CompetitionError, createCompetition } from "@/lib/competition-service";
import { getSettings } from "@/lib/settings";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

/** المعلم: إنشاء مسابقة مباشرة جديدة */
export async function POST(req: Request) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { classroom?: unknown; seconds?: unknown };
    await ensureSchema();
    const settings = await getSettings();
    const seconds =
      typeof body.seconds === "number" && Number.isFinite(body.seconds)
        ? Math.min(90, Math.max(10, Math.round(body.seconds)))
        : settings.competition.seconds;
    const classroom = typeof body.classroom === "string" ? body.classroom.trim() : "";
    const comp = await createCompetition(classroom, seconds);
    return Response.json({ ok: true, code: comp.code, id: comp.id });
  } catch (error) {
    console.error("[competitions POST]", error);
    const status = error instanceof CompetitionError ? error.status : 500;
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "تعذر إنشاء المسابقة" }, { status });
  }
}
