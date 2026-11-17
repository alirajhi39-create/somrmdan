import { ensureSchema } from "@/db/ensure-schema";
import { getSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

/** عام: تقرؤه أجهزة الطلاب لتطبيق إعدادات الصوت */
export async function GET() {
  try {
    await ensureSchema();
    const settings = await getSettings();
    return Response.json({ ok: true, settings });
  } catch (error) {
    console.error("[settings GET]", error);
    return Response.json({ ok: true, settings: DEFAULT_SETTINGS, fallback: true });
  }
}

/** المعلم فقط: حفظ الإعدادات */
export async function PUT(req: Request) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    await ensureSchema();
    const settings = await saveSettings(body);
    return Response.json({ ok: true, settings });
  } catch (error) {
    console.error("[settings PUT]", error);
    return Response.json({ ok: false, error: "تعذر حفظ الإعدادات" }, { status: 500 });
  }
}
