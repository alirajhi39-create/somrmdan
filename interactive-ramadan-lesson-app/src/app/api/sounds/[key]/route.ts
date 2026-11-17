import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { sounds } from "@/db/schema";
import { isTeacherRequest } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

function toBody(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy;
}

/** عام: بث الملف الصوتي (مع دعم Range للتشغيل في جميع المتصفحات) */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  try {
    await ensureSchema();
    const [row] = await db.select().from(sounds).where(eq(sounds.key, decodeURIComponent(key))).limit(1);
    if (!row) return new Response("not found", { status: 404 });

    const buf = row.data;
    const total = buf.length;
    const baseHeaders: Record<string, string> = {
      "Content-Type": row.mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    };

    const range = req.headers.get("range");
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
        if (start <= end && start < total) {
          const chunk = buf.subarray(start, end + 1);
          return new Response(toBody(chunk), {
            status: 206,
            headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(chunk.length) },
          });
        }
      }
    }

    return new Response(toBody(buf), {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(total) },
    });
  } catch (error) {
    console.error("[sounds GET key]", error);
    return new Response("error", { status: 500 });
  }
}

/** المعلم: حذف صوت مخصص (العودة إلى الافتراضي) */
export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!isTeacherRequest(req)) {
    return Response.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }
  const { key } = await params;
  try {
    await ensureSchema();
    await db.delete(sounds).where(eq(sounds.key, decodeURIComponent(key)));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[sounds DELETE]", error);
    return Response.json({ ok: false, error: "تعذر حذف الصوت" }, { status: 500 });
  }
}
