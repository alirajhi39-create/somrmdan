import { cookies } from "next/headers";
import { TEACHER_COOKIE, makeSessionToken, passwordMatches } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!passwordMatches(password)) {
    return Response.json({ ok: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const token = makeSessionToken();

  // كوكي احتياطي (الرمز في الاستجابة هو المسار الأساسي ويعمل داخل الإطارات أيضًا)
  try {
    const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    const secure = proto.split(",")[0].trim() === "https";
    const store = await cookies();
    store.set(TEACHER_COOKIE, token, {
      httpOnly: true,
      sameSite: secure ? "none" : "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    /* تجاهل أي خطأ في ضبط الكوكي */
  }

  return Response.json({ ok: true, token });
}
