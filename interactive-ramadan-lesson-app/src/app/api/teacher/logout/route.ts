import { cookies } from "next/headers";
import { TEACHER_COOKIE } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  store.delete(TEACHER_COOKIE);
  return Response.json({ ok: true });
}
