"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSound } from "@/components/lesson/useSound";
import { UnauthorizedError, getStoredToken, teacherFetch } from "@/components/teacher/teacher-client";
import type { CompetitionState } from "@/lib/competition-types";
import { SCHOOL_NAME, SECTIONS } from "@/lib/lesson-data";

const OPTION_STYLES = [
  "border-emerald-400 bg-emerald-50 text-emerald-900",
  "border-amber-400 bg-amber-50 text-amber-900",
  "border-sky-400 bg-sky-50 text-sky-900",
  "border-rose-400 bg-rose-50 text-rose-900",
];
const LETTERS = ["أ", "ب", "ج", "د"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function BoardView({ code }: { code: string }) {
  const sound = useSound();
  const [state, setState] = useState<CompetitionState | null>(null);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);
  const [joinUrl, setJoinUrl] = useState("/play");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const offsetRef = useRef(0);
  const autoRevealRef = useRef(-1);
  const prevStatusRef = useRef("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitions/${code}/state`, { cache: "no-store" });
      if (res.status === 404) {
        setError("لا توجد مسابقة بهذا الرمز");
        return;
      }
      const j = (await res.json()) as { ok: boolean; state?: CompetitionState };
      if (j.ok && j.state) {
        offsetRef.current = new Date(j.state.serverNow).getTime() - Date.now();
        setState(j.state);
        setError("");
      }
    } catch {
      /* سنعيد المحاولة في الدورة التالية */
    }
  }, [code]);

  useEffect(() => {
    setAuthed(Boolean(getStoredToken()));
    setJoinUrl(`${window.location.host}/play`);
    void load();
    const id = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!state?.questionStartedAt || state.status !== "question") return 0;
    const started = new Date(state.questionStartedAt).getTime();
    const serverNow = now + offsetRef.current;
    return Math.max(0, state.questionSeconds * 1000 - (serverNow - started));
  }, [state, now]);

  const control = useCallback(
    async (action: "start" | "next" | "reveal" | "finish") => {
      setBusy(true);
      try {
        const res = await teacherFetch(`/api/competitions/${code}/control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) await load();
      } catch (e) {
        if (e instanceof UnauthorizedError) setAuthed(false);
      } finally {
        setBusy(false);
      }
    },
    [code, load],
  );

  // كشف الإجابة تلقائيًا عند انتهاء الوقت
  useEffect(() => {
    if (state?.status === "question" && remainingMs <= 0 && authed && autoRevealRef.current !== state.currentIndex) {
      autoRevealRef.current = state.currentIndex;
      void control("reveal");
    }
  }, [state, remainingMs, authed, control]);

  // مؤثرات صوتية عند تغيّر الحالة
  useEffect(() => {
    const s = state?.status;
    if (!s || s === prevStatusRef.current) return;
    if (prevStatusRef.current) {
      if (s === "reveal") sound.playCorrect();
      if (s === "finished") sound.playComplete();
      if (s === "question") sound.playClick();
    }
    prevStatusRef.current = s;
  }, [state?.status, sound]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="card max-w-md p-8 text-center">
          <div className="text-5xl">🔎</div>
          <h1 className="mt-3 text-2xl font-black text-ramadan-deep">{error}</h1>
          <Link href="/teacher" className="btn-primary mt-5">
            ↩ لوحة المعلم
          </Link>
        </section>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-2xl font-black text-ramadan-deep">⏳ جارٍ تحميل المسابقة...</p>
      </main>
    );
  }

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = state.status === "question" ? remainingMs / (state.questionSeconds * 1000) : 0;
  const isLast = state.currentIndex >= state.totalQuestions - 1;
  const top = state.players.slice(0, 10);
  const leadingTeam = [...state.teams].sort((a, b) => b.score - a.score)[0];
  const teamsTied = state.teams.length > 1 && state.teams.every((t) => t.score === state.teams[0].score);

  return (
    <div className="min-h-screen pattern-bg text-white">
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">🏆 مسابقة «صوم رمضان» المباشرة</h1>
          <p className="text-sm font-bold text-emerald-100">
            {SCHOOL_NAME}
            {state.classroom ? ` • ${state.classroom}` : ` • ${SECTIONS.join(" و ")}`}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-2">
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-100">ادخلوا إلى</p>
            <p className="text-lg font-black" dir="ltr">
              {joinUrl}
            </p>
          </div>
          <div className="h-10 w-px bg-white/30" />
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-100">رمز المسابقة</p>
            <p className="text-4xl font-black tracking-widest text-ramadan-gold" dir="ltr">
              {state.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-black">👥 {state.players.length} مشارك</span>
          <button type="button" onClick={sound.toggleMute} className="rounded-full bg-white/15 px-3 py-1 text-sm font-black" title="الصوت">
            {sound.muted ? "🔇" : "🔊"}
          </button>
          <Link href="/teacher" className="rounded-full bg-white/15 px-3 py-1 text-sm font-black hover:bg-white/25">
            ↩ اللوحة
          </Link>
        </div>
      </header>

      {!authed && (
        <p className="no-print mx-6 mt-4 rounded-2xl border border-amber-300/60 bg-amber-100/20 px-4 py-2 text-center text-sm font-bold text-amber-100">
          👀 وضع العرض فقط — للتحكم في المسابقة سجّل الدخول كمعلم من{" "}
          <Link href="/teacher" className="underline">
            لوحة المعلم
          </Link>{" "}
          ثم افتح هذه الصفحة.
        </p>
      )}

      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* مجموع الشعبتين */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          {state.teams.map((t, i) => (
            <div key={t.name} className="rounded-3xl bg-white/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xl font-black">
                  {i === 0 ? "🅰️" : "🅱️"} {t.name}
                </p>
                <p className="text-3xl font-black text-ramadan-gold">{t.score}</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-ramadan-gold transition-all duration-700"
                  style={{
                    width: `${Math.max(4, Math.round((t.score / Math.max(1, Math.max(...state.teams.map((x) => x.score)))) * 100))}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs font-bold text-emerald-100">{t.players} طالب</p>
            </div>
          ))}
        </section>

        {/* الانتظار */}
        {state.status === "lobby" && (
          <section className="card text-slate-800">
            <div className="p-6 text-center">
              <div className="text-6xl">🌙</div>
              <h2 className="mt-2 text-3xl font-black text-ramadan-deep">بانتظار انضمام الطلاب</h2>
              <p className="mt-1 font-bold text-slate-500">
                اكتبوا الرمز <span className="font-black text-ramadan-deep">{state.code}</span> في صفحة المسابقة على أجهزتكم • {state.totalQuestions} سؤالًا •{" "}
                {state.questionSeconds} ثانية لكل سؤال
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {state.players.length === 0 && <span className="font-bold text-slate-400">لم ينضم أحد بعد...</span>}
                {state.players.map((p) => (
                  <span key={p.id} className="animate-pop rounded-full border-2 border-emerald-200 bg-white px-4 py-1.5 text-lg font-black text-ramadan-deep">
                    {p.team === SECTIONS[1] ? "🅱️" : "🅰️"} {p.name}
                  </span>
                ))}
              </div>
              {authed && (
                <button type="button" className="btn-primary mt-6 px-10 py-4 text-2xl" onClick={() => void control("start")} disabled={busy}>
                  ▶ ابدأ المسابقة
                </button>
              )}
            </div>
          </section>
        )}

        {/* السؤال */}
        {(state.status === "question" || state.status === "reveal") && state.question && (
          <section className="card text-slate-800">
            <div className="flex items-center justify-between border-b border-emerald-100 px-6 py-3">
              <span className="chip">
                ❓ السؤال {state.currentIndex + 1} من {state.totalQuestions}
              </span>
              <span className="chip">📨 الإجابات: {state.answersCount} / {state.players.length}</span>
              {state.status === "question" ? (
                <span className={`text-4xl font-black ${secondsLeft <= 5 ? "animate-pulse text-rose-600" : "text-ramadan-deep"}`}>⏱️ {secondsLeft}</span>
              ) : (
                <span className="chip bg-emerald-100 text-emerald-800">✅ تم كشف الإجابة</span>
              )}
            </div>
            {state.status === "question" && (
              <div className="h-3 bg-slate-100">
                <div className="h-full bg-gradient-to-l from-ramadan-green to-ramadan-gold transition-all duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            <div className="p-6">
              <h2 className="text-center text-3xl font-black leading-relaxed text-ramadan-deep sm:text-4xl">{state.question.prompt}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {state.question.options.map((opt, i) => {
                  const isAnswer = state.question?.answer === i;
                  const count = state.optionCounts?.[i] ?? 0;
                  const total = Math.max(1, state.answersCount);
                  return (
                    <div
                      key={i}
                      className={`relative overflow-hidden rounded-2xl border-4 px-5 py-5 text-2xl font-black transition ${OPTION_STYLES[i % OPTION_STYLES.length]} ${
                        state.status === "reveal" && !isAnswer ? "opacity-50" : ""
                      } ${state.status === "reveal" && isAnswer ? "scale-[1.02] ring-4 ring-emerald-300" : ""}`}
                    >
                      {state.status === "reveal" && (
                        <div className="absolute inset-y-0 right-0 bg-black/5" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                      )}
                      <div className="relative flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/80 text-xl">{LETTERS[i]}</span>
                        <span className="flex-1">{opt}</span>
                        {state.status === "reveal" && (
                          <span className="text-lg">
                            {isAnswer ? "✅ " : ""}
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {state.status === "reveal" && state.question.explain && (
                <p className="mt-5 rounded-2xl bg-ramadan-sand px-4 py-3 text-center text-xl font-bold text-ramadan-deep">💡 {state.question.explain}</p>
              )}
            </div>

            {state.status === "reveal" && (
              <div className="border-t border-emerald-100 p-6">
                <h3 className="mb-3 text-xl font-black text-ramadan-deep">📊 الترتيب الحالي</h3>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {top.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2">
                      <span className="font-black text-slate-700">
                        {MEDALS[p.rank - 1] ?? `${p.rank}.`} {p.name} <span className="text-xs text-slate-400">({p.team})</span>
                      </span>
                      <span className="font-black text-ramadan-deep">{p.score}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {authed && (
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-emerald-100 bg-emerald-50/60 px-6 py-4">
                {state.status === "question" && (
                  <button type="button" className="btn-gold" onClick={() => void control("reveal")} disabled={busy}>
                    👁️ إظهار الإجابة الآن
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={() => void control(isLast ? "finish" : "next")} disabled={busy}>
                  {isLast ? "🏁 إنهاء المسابقة وعرض النتائج" : "⏭ السؤال التالي"}
                </button>
                {!isLast && (
                  <button type="button" className="btn-ghost" onClick={() => void control("finish")} disabled={busy}>
                    🏁 إنهاء مبكر
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* النتائج النهائية */}
        {state.status === "finished" && (
          <section id="report-root" className="card text-slate-800">
            <div className="p-6 text-center">
              <div className="text-6xl">🎉🏆🎉</div>
              <h2 className="mt-2 text-3xl font-black text-ramadan-deep">انتهت المسابقة — مبارك للفائزين!</h2>
              {leadingTeam && !teamsTied && (
                <p className="mt-2 text-xl font-black text-ramadan-gold-dark">
                  🏅 الشعبة الفائزة: {leadingTeam.name} بمجموع {leadingTeam.score} نقطة
                </p>
              )}
              {teamsTied && <p className="mt-2 text-xl font-black text-ramadan-gold-dark">🤝 تعادل بين الشعبتين!</p>}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {state.players.slice(0, 3).map((p, i) => (
                  <div key={p.id} className={`rounded-3xl border-2 p-5 ${i === 0 ? "border-ramadan-gold bg-amber-50 sm:order-2 sm:-translate-y-3" : i === 1 ? "border-slate-300 bg-slate-50 sm:order-1" : "border-orange-300 bg-orange-50 sm:order-3"}`}>
                    <div className="text-5xl">{MEDALS[i]}</div>
                    <p className="mt-2 text-2xl font-black text-ramadan-deep">{p.name}</p>
                    <p className="text-sm font-bold text-slate-500">{p.team}</p>
                    <p className="mt-1 text-3xl font-black text-ramadan-gold-dark">{p.score}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-emerald-100 p-6">
              <h3 className="mb-3 text-xl font-black text-ramadan-deep">الترتيب الكامل</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ramadan-mint text-ramadan-deep">
                    <th className="border border-emerald-100 px-2 py-2">#</th>
                    <th className="border border-emerald-100 px-2 py-2 text-right">الطالب</th>
                    <th className="border border-emerald-100 px-2 py-2">الشعبة</th>
                    <th className="border border-emerald-100 px-2 py-2">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {state.players.map((p) => (
                    <tr key={p.id} className="odd:bg-white even:bg-emerald-50/40">
                      <td className="border border-emerald-100 px-2 py-1.5 text-center font-bold">{p.rank}</td>
                      <td className="border border-emerald-100 px-2 py-1.5 font-black">{p.name}</td>
                      <td className="border border-emerald-100 px-2 py-1.5 text-center font-bold">{p.team}</td>
                      <td className="border border-emerald-100 px-2 py-1.5 text-center font-black text-ramadan-deep">{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="no-print mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn-primary" onClick={() => window.print()}>
                  🖨️ طباعة النتائج
                </button>
                <Link href="/teacher" className="btn-ghost">
                  ↩ لوحة المعلم
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
