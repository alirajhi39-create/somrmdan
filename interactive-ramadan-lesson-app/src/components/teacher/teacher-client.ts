"use client";

/**
 * إدارة رمز دخول المعلم من جهة المتصفح.
 * يُحفظ في localStorage/sessionStorage (مع نسخة في الذاكرة) ويُرسل في ترويسة Authorization،
 * لذا يعمل حتى عندما تمنع المتصفحات الكوكيز داخل الإطارات (iframe).
 */
export const TEACHER_TOKEN_KEY = "ramadan_teacher_token";

let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    const t = window.localStorage.getItem(TEACHER_TOKEN_KEY) ?? window.sessionStorage.getItem(TEACHER_TOKEN_KEY);
    if (t) memoryToken = t;
    return t;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  memoryToken = token;
  try {
    window.localStorage.setItem(TEACHER_TOKEN_KEY, token);
  } catch {
    /* التخزين غير متاح */
  }
  try {
    window.sessionStorage.setItem(TEACHER_TOKEN_KEY, token);
  } catch {
    /* التخزين غير متاح */
  }
}

export function clearToken(): void {
  memoryToken = null;
  try {
    window.localStorage.removeItem(TEACHER_TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
  try {
    window.sessionStorage.removeItem(TEACHER_TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function teacherFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  if (res.status === 401) throw new UnauthorizedError();
  return res;
}
