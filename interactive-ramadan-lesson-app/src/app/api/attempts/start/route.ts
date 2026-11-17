import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { attempts, students } from "@/db/schema";
import { TOTAL_MAX_POINTS } from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: unknown; classroom?: unknown };
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const classroom = typeof body.classroom === "string" ? body.classroom.trim() : "";

    if (name.length < 2 || name.length > 60) {
      return Response.json({ ok: false, error: "يرجى كتابة اسم صحيح (حرفان على الأقل)" }, { status: 400 });
    }

    await ensureSchema();

    const [student] = await db
      .insert(students)
      .values({ name, classroom })
      .onConflictDoUpdate({
        target: [students.name, students.classroom],
        set: { name },
      })
      .returning();

    const [attempt] = await db
      .insert(attempts)
      .values({ studentId: student.id, maxScore: TOTAL_MAX_POINTS })
      .returning();

    return Response.json({ ok: true, studentId: student.id, attemptId: attempt.id });
  } catch (error) {
    console.error("[attempts/start]", error);
    return Response.json({ ok: false, error: "تعذر الاتصال بقاعدة البيانات" }, { status: 500 });
  }
}
