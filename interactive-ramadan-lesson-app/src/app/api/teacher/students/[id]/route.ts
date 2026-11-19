import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { attempts, students } from "@/db/schema";
import { SECTIONS } from "@/lib/lesson-data";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** المعلم: تعديل اسم الطالب و/أو شعبته */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await params;
  const studentId = parseId(id);
  if (!studentId) return Response.json({ ok: false, error: "رقم الطالب غير صحيح" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { name?: unknown; classroom?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const classroomRaw = typeof body.classroom === "string" ? body.classroom.trim() : "";

  if (name.length < 2 || name.length > 60) {
    return Response.json({ ok: false, error: "اكتب اسمًا صحيحًا (من حرفين إلى 60 حرفًا)" }, { status: 400 });
  }
  if (classroomRaw && !SECTIONS.includes(classroomRaw)) {
    return Response.json({ ok: false, error: "الشعبة يجب أن تكون شعبة أ أو شعبة ب" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const [existing] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!existing) return Response.json({ ok: false, error: "الطالب غير موجود" }, { status: 404 });

    const classroom = classroomRaw || existing.classroom;

    const [duplicate] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.name, name), eq(students.classroom, classroom), ne(students.id, studentId)))
      .limit(1);
    if (duplicate) {
      return Response.json({ ok: false, error: `يوجد طالب آخر بالاسم «${name}» في ${classroom || "الشعبة نفسها"}` }, { status: 409 });
    }

    const [updated] = await db.update(students).set({ name, classroom }).where(eq(students.id, studentId)).returning();

    // تحديث اسم الشهادة في المحاولات التي صدرت بالاسم القديم
    if (existing.name !== name) {
      await db
        .update(attempts)
        .set({ certificateName: name })
        .where(and(eq(attempts.studentId, studentId), eq(attempts.certificateName, existing.name)));
    }

    return Response.json({ ok: true, student: { id: updated.id, name: updated.name, classroom: updated.classroom } });
  } catch (error) {
    console.error("[teacher/students patch]", error);
    return Response.json({ ok: false, error: "تعذر حفظ التعديل" }, { status: 500 });
  }
}

/** المعلم: حذف الطالب وجميع محاولاته */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { id } = await params;
  const studentId = parseId(id);
  if (!studentId) return Response.json({ ok: false, error: "رقم الطالب غير صحيح" }, { status: 400 });
  try {
    await ensureSchema();
    await db.delete(students).where(eq(students.id, studentId));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[teacher/students delete]", error);
    return Response.json({ ok: false, error: "تعذر حذف الطالب" }, { status: 500 });
  }
}
