import { createHmac, timingSafeEqual } from "crypto";

export const TEACHER_COOKIE = "ramadan_teacher_session";
const DEFAULT_TEACHER_PASSWORD = "139613";

export function teacherPassword(): string {
  return process.env.TEACHER_PASSWORD || DEFAULT_TEACHER_PASSWORD;
}

function secret(): string {
  return process.env.TEACHER_SESSION_SECRET || `alaroos-ramadan::${teacherPassword()}`;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** رمز الجلسة: HMAC ثابت مشتق من كلمة المرور الحالية (يبطل تلقائيًا عند تغييرها) */
export function makeSessionToken(): string {
  return createHmac("sha256", secret()).update(`teacher-session-v2:${teacherPassword()}`).digest("hex");
}

export function isValidSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    return safeEqual(token, makeSessionToken());
  } catch {
    return false;
  }
}

export function passwordMatches(input: string): boolean {
  try {
    return safeEqual(input ?? "", teacherPassword());
  } catch {
    return false;
  }
}

function tokenFromCookie(req: Request): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${TEACHER_COOKIE}=`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match.slice(TEACHER_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}

/**
 * التحقق من هوية المعلم: يقبل الرمز عبر ترويسة Authorization (الأساسي — يعمل داخل الإطارات)
 * أو عبر الكوكي أو معامل الاستعلام token (احتياطي).
 */
export function isTeacherRequest(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ") && isValidSessionToken(auth.slice(7).trim())) return true;
  if (isValidSessionToken(req.headers.get("x-teacher-token"))) return true;
  if (isValidSessionToken(tokenFromCookie(req))) return true;
  try {
    if (isValidSessionToken(new URL(req.url).searchParams.get("token"))) return true;
  } catch {
    /* تجاهل */
  }
  return false;
}
