import { ensureSchema } from "@/db/ensure-schema";
import { CompetitionError, controlCompetition, type ControlAction } from "@/lib/competition-service";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

const ACTIONS: ControlAction[] = ["start", "next", "reveal", "finish"];

/** المعلم: التحكم في سير المسابقة */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  const action = typeof body.action === "string" && ACTIONS.includes(body.action as ControlAction) ? (body.action as ControlAction) : null;
  if (!action) return Response.json({ ok: false, error: "إجراء غير معروف" }, { status: 400 });
  try {
    await ensureSchema();
    const comp = await controlCompetition(code.trim(), action);
    return Response.json({ ok: true, status: comp.status, currentIndex: comp.currentIndex });
  } catch (error) {
    const status = error instanceof CompetitionError ? error.status : 500;
    if (status === 500) console.error("[competitions control]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "تعذر تنفيذ الإجراء" }, { status });
  }
}
