import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { sounds } from "@/db/schema";
import { MAX_SOUND_BYTES, SOUND_SLOT_KEYS } from "@/lib/sound-slots";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

/** عام: قائمة الأصوات المخصصة المتاحة (بدون البيانات) */
export async function GET() {
  try {
    await ensureSchema();
    const rows = await db
      .select({ key: sounds.key, filename: sounds.filename, mime: sounds.mime, size: sounds.size, updatedAt: sounds.updatedAt })
      .from(sounds);
    return Response.json({
      ok: true,
      sounds: rows.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() })),
    });
  } catch (error) {
    console.error("[sounds GET]", error);
    return Response.json({ ok: true, sounds: [], fallback: true });
  }
}

function guessMime(filename: string, provided: string): string {
  if (provided && provided.startsWith("audio/")) return provided;
  if (provided === "video/webm") return "audio/webm";
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    aac: "audio/aac",
    webm: "audio/webm",
    flac: "audio/flac",
  };
  return map[ext] ?? "";
}

/** المعلم: رفع/استبدال صوت لخانة معينة (multipart/form-data: key, file) */
export async function POST(req: Request) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const key = String(form.get("key") ?? "").trim();
    const file = form.get("file");
    if (!SOUND_SLOT_KEYS.has(key)) {
      return Response.json({ ok: false, error: "خانة صوت غير معروفة" }, { status: 400 });
    }
    if (!(file instanceof Blob) || file.size === 0) {
      return Response.json({ ok: false, error: "لم يتم اختيار ملف صوتي" }, { status: 400 });
    }
    if (file.size > MAX_SOUND_BYTES) {
      return Response.json({ ok: false, error: "حجم الملف كبير — الحد الأقصى 2.5 ميجابايت" }, { status: 413 });
    }
    const filename = (file instanceof File && file.name ? file.name : "sound").slice(0, 120);
    const mime = guessMime(filename, file.type);
    if (!mime) {
      return Response.json({ ok: false, error: "نوع الملف غير مدعوم — استخدم mp3 أو wav أو ogg أو m4a" }, { status: 415 });
    }
    const data = Buffer.from(await file.arrayBuffer());

    await ensureSchema();
    await db
      .insert(sounds)
      .values({ key, filename, mime, size: data.length, data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: sounds.key, set: { filename, mime, size: data.length, data, updatedAt: new Date() } });

    return Response.json({ ok: true, sound: { key, filename, mime, size: data.length, updatedAt: new Date().toISOString() } });
  } catch (error) {
    console.error("[sounds POST]", error);
    return Response.json({ ok: false, error: "تعذر حفظ الصوت" }, { status: 500 });
  }
}
