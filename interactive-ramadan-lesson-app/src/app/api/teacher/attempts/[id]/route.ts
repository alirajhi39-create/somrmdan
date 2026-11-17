import { ensureSchema } from "@/db/ensure-schema";
import { isTeacherRequest } from "@/lib/teacher-auth";
import { getAttemptDetail } from "@/lib/teacher-queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await params;
  const attemptId = Number(id);
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return Response.json({ ok: false, error: "رقم المحاولة غير صحيح" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const data = await getAttemptDetail(attemptId);
    if (!data) return Response.json({ ok: false, error: "المحاولة غير موجودة" }, { status: 404 });
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("[teacher/attempts]", error);
    return Response.json({ ok: false, error: "تعذر الاتصال بقاعدة البيانات" }, { status: 500 });
  }
}
