import LessonApp from "@/components/lesson/LessonApp";
import { ensureSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let dbReady = true;
  try {
    // إنشاء الجداول تلقائيًا عند أول زيارة (مفيد عند الربط بقاعدة Neon على Vercel)
    await ensureSchema();
  } catch (error) {
    console.error("[home] database not ready:", error);
    dbReady = false;
  }
  return <LessonApp dbReady={dbReady} />;
}
