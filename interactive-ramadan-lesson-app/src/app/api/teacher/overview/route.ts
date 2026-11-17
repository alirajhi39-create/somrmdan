import { ensureSchema } from "@/db/ensure-schema";
import { isTeacherRequest } from "@/lib/teacher-auth";
import { getOverview } from "@/lib/teacher-queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const classroom = new URL(req.url).searchParams.get("classroom") ?? "";
  try {
    await ensureSchema();
    const data = await getOverview(classroom);
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("[teacher/overview]", error);
    return Response.json({ ok: false, error: "تعذر الاتصال بقاعدة البيانات" }, { status: 500 });
  }
}
