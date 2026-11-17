"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SCHOOL_NAME, SUBJECT } from "@/lib/lesson-data";

export default function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; error?: string };
      if (res.ok && data.ok && data.token) {
        onSuccess(data.token);
      } else {
        setError(data.error ?? "كلمة المرور غير صحيحة");
      }
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="card w-full max-w-md animate-pop p-8">
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-ramadan-green to-ramadan-deep text-4xl shadow-lg">
            👨‍🏫
          </div>
          <h1 className="mt-4 text-3xl font-black text-ramadan-deep">دخول المعلم</h1>
          <p className="mt-1 font-bold text-slate-500">
            {SCHOOL_NAME} • {SUBJECT}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="teacher-password" className="mb-1 block font-black text-ramadan-deep">
              🔑 كلمة المرور
            </label>
            <input
              id="teacher-password"
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border-2 border-emerald-200 px-4 py-3 text-lg font-bold outline-none transition focus:border-ramadan-green focus:ring-4 focus:ring-emerald-100"
              placeholder="••••••"
              required
              autoFocus
            />
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-2 font-bold text-rose-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "⏳ جارٍ التحقق..." : "دخول إلى لوحة المتابعة"}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/" className="font-bold text-ramadan-green underline-offset-4 hover:underline">
            ↩ العودة إلى صفحة الطالب
          </Link>
        </p>
      </section>
    </main>
  );
}
