import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { students } from "@/db/schema";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return Response.json({ ok: false, error: "رقم الطالب غير صحيح" }, { status: 400 });
  }
  try {
    await ensureSchema();
    await db.delete(students).where(eq(students.id, studentId));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[teacher/students delete]", error);
    return Response.json({ ok: false, error: "تعذر حذف الطالب" }, { status: 500 });
  }
}
