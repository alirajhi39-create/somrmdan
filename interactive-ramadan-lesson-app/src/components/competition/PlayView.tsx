"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSound } from "@/components/lesson/useSound";
import type { CompetitionState } from "@/lib/competition-types";
import { SCHOOL_NAME, SECTIONS } from "@/lib/lesson-data";

const SESSION_KEY = "ramadan_play_session_v1";
const LETTERS = ["أ", "ب", "ج", "د"];
const OPTION_STYLES = [
  "border-emerald-400 bg-emerald-50 text-emerald-900",
  "border-amber-400 bg-amber-50 text-amber-900",
  "border-sky-400 bg-sky-50 text-sky-900",
  "border-rose-400 bg-rose-50 text-rose-900",
];

interface Session {
  code: string;
  playerId: number;
  name: string;
  team: string;
}

export default function PlayView() {
  const sound = useSound();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<CompetitionState | null>(null);
  const [form, setForm] = useState({ code: "", name: "", team: SECTIONS[0] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const offsetRef = useRef(0);
  const prevStatusRef = useRef("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* تجاهل */
    }
    setReady(true);
  }, []);

  const leave = useCallback((message = "") => {
    setSession(null);
    setState(null);
    setError(message);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* تجاهل */
    }
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/competitions/${session.code}/state?playerId=${session.playerId}`, { cache: "no-store" });
      if (res.status === 404) {
        leave("انتهت المسابقة أو الرمز غير صحيح");
        return;
      }
      const j = (await res.json()) as { ok: boolean; state?: CompetitionState };
      if (j.ok && j.state) {
        offsetRef.current = new Date(j.state.serverNow).getTime() - Date.now();
        setState(j.state);
      }
    } catch {
      /* إعادة المحاولة لاحقًا */
    }
  }, [session, leave]);

  useEffect(() => {
    if (!session) return;
    void load();
    const id = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(id);
  }, [session, load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const s = state?.status;
    if (!s || s === prevStatusRef.current) return;
    if (prevStatusRef.current && s === "reveal") {
      if (state?.me?.answer?.correct) sound.playCorrect();
      else sound.playWrong();
    }
    if (prevStatusRef.current && s === "finished") sound.playComplete();
    prevStatusRef.current = s;
  }, [state, sound]);

  const remainingMs = useMemo(() => {
    if (!state?.questionStartedAt || state.status !== "question") return 0;
    const started = new Date(state.questionStartedAt).getTime();
    return Math.max(0, state.questionSeconds * 1000 - (now + offsetRef.current - started));
  }, [state, now]);

  async function join(e: FormEvent) {
    e.preventDefault();
    const code = form.code.trim();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (!/^\d{4}$/.test(code)) {
      setError("اكتب رمز المسابقة المكوّن من 4 أرقام كما يظهر على السبورة");
      return;
    }
    if (name.length < 2) {
      setError("اكتب اسمك من فضلك");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/competitions/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, team: form.team }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; playerId?: number; error?: string };
      if (!res.ok || !j.ok || !j.playerId) throw new Error(j.error || "تعذر الانضمام");
      const s: Session = { code, playerId: j.playerId, name, team: form.team };
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      } catch {
        /* تجاهل */
      }
      setSession(s);
      sound.playClick();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الانضمام");
    } finally {
      setBusy(false);
    }
  }

  async function answer(optionIndex: number) {
    if (!session || !state || state.status !== "question" || state.me?.answer || busy) return;
    setBusy(true);
    sound.playClick();
    try {
      const res = await fetch(`/api/competitions/${session.code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.playerId, optionIndex }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok && j.error) setError(j.error);
      else setError("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  /* ---------- نموذج الانضمام ---------- */
  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <section className="card w-full max-w-md animate-pop p-7">
          <div className="text-center">
            <div className="text-6xl">🏆</div>
            <h1 className="mt-2 text-3xl font-black text-ramadan-deep">مسابقة صوم رمضان</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">{SCHOOL_NAME} • اكتب الرمز الظاهر على السبورة</p>
          </div>
          <form onSubmit={(e) => void join(e)} className="mt-6 space-y-4">
            <div>
              <label htmlFor="play-code" className="mb-1 block font-black text-ramadan-deep">
                🔢 رمز المسابقة
              </label>
              <input
                id="play-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })}
                placeholder="مثال: 4827"
                dir="ltr"
                className="w-full rounded-2xl border-2 border-emerald-200 px-4 py-3 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-ramadan-green focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="play-name" className="mb-1 block font-black text-ramadan-deep">
                ✏️ اسمك
              </label>
              <input
                id="play-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={40}
                placeholder="مثال: محمد عبدالله"
                className="w-full rounded-2xl border-2 border-emerald-200 px-4 py-3 text-xl font-bold outline-none focus:border-ramadan-green focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <p className="mb-2 font-black text-ramadan-deep">🏫 الشعبة</p>
              <div className="grid grid-cols-2 gap-3">
                {SECTIONS.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, team: t })}
                    className={`rounded-2xl border-2 px-4 py-3 text-xl font-black transition ${
                      form.team === t ? "border-ramadan-green bg-ramadan-green text-white shadow-lg" : "border-emerald-200 bg-white text-ramadan-deep"
                    }`}
                  >
                    {i === 0 ? "🅰️" : "🅱️"} {t}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="rounded-xl bg-rose-50 px-4 py-2 font-bold text-rose-700">{error}</p>}
            <button type="submit" className="btn-primary w-full py-4 text-xl" disabled={busy}>
              {busy ? "⏳ جارٍ الانضمام..." : "🚀 انضم إلى المسابقة"}
            </button>
          </form>
          <p className="mt-5 text-center">
            <Link href="/" className="font-bold text-ramadan-green underline-offset-4 hover:underline">
              ↩ العودة إلى الدرس
            </Link>
          </p>
        </section>
      </main>
    );
  }

  const me = state?.me ?? null;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = state?.status === "question" ? remainingMs / (state.questionSeconds * 1000) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
        <div>
          <p className="font-black text-ramadan-deep">👋 {session.name}</p>
          <p className="text-xs font-bold text-slate-500">
            {session.team} • الرمز {session.code}
          </p>
        </div>
        <div className="text-left">
          <p className="text-2xl font-black text-ramadan-gold-dark">{me?.score ?? 0} نقطة</p>
          <p className="text-xs font-bold text-slate-500">{me ? `الترتيب #${me.rank}` : ""}</p>
        </div>
      </header>

      {!state && <p className="card p-6 text-center text-xl font-black text-ramadan-deep">⏳ جارٍ الاتصال بالمسابقة...</p>}

      {state?.status === "lobby" && (
        <section className="card p-8 text-center">
          <div className="animate-float text-6xl">🌙</div>
          <h2 className="mt-3 text-2xl font-black text-ramadan-deep">تم تسجيلك! بانتظار أن يبدأ المعلم المسابقة</h2>
          <p className="mt-2 font-bold text-slate-500">👥 {state.players.length} مشارك حتى الآن</p>
        </section>
      )}

      {state?.status === "question" && state.question && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="chip">
              ❓ {state.currentIndex + 1} / {state.totalQuestions}
            </span>
            <span className={`text-3xl font-black ${secondsLeft <= 5 ? "animate-pulse text-rose-600" : "text-ramadan-deep"}`}>⏱️ {secondsLeft}</span>
          </div>
          <div className="h-2 bg-slate-100">
            <div className="h-full bg-gradient-to-l from-ramadan-green to-ramadan-gold transition-all duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="p-4">
            <h2 className="text-center text-2xl font-black leading-relaxed text-ramadan-deep">{state.question.prompt}</h2>
            {me?.answer ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center">
                <div className="text-4xl">📨</div>
                <p className="mt-2 text-xl font-black text-emerald-800">تم استلام إجابتك! بانتظار كشف النتيجة على السبورة</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {state.question.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={busy || remainingMs <= 0}
                    onClick={() => void answer(i)}
                    className={`flex items-center gap-3 rounded-2xl border-4 px-4 py-4 text-right text-xl font-black transition active:scale-95 disabled:opacity-60 ${OPTION_STYLES[i % OPTION_STYLES.length]}`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/80 text-lg">{LETTERS[i]}</span>
                    <span>{opt}</span>
                  </button>
                ))}
                {remainingMs <= 0 && <p className="text-center font-bold text-rose-600">⏰ انتهى وقت هذا السؤال</p>}
              </div>
            )}
            {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-center text-sm font-bold text-rose-700">{error}</p>}
          </div>
        </section>
      )}

      {state?.status === "reveal" && state.question && (
        <section className={`card p-6 text-center ${me?.answer?.correct ? "border-emerald-300" : "border-rose-200"}`}>
          <div className="text-6xl">{me?.answer ? (me.answer.correct ? "🎉" : "💪") : "⏰"}</div>
          <h2 className="mt-2 text-2xl font-black text-ramadan-deep">
            {me?.answer ? (me.answer.correct ? `إجابة صحيحة! +${me.answer.points} نقطة` : "إجابة غير صحيحة هذه المرة") : "لم تُجب في الوقت المحدد"}
          </h2>
          <p className="mt-3 rounded-2xl bg-ramadan-sand px-4 py-3 text-lg font-bold text-ramadan-deep">
            ✅ الإجابة الصحيحة: {state.question.answer !== null ? state.question.options[state.question.answer] : ""}
          </p>
          {state.question.explain && <p className="mt-2 text-sm font-bold text-slate-500">💡 {state.question.explain}</p>}
          <p className="mt-4 font-black text-ramadan-gold-dark">
            مجموعك: {me?.score ?? 0} • ترتيبك: #{me?.rank ?? "—"} من {state.players.length}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-400">بانتظار السؤال التالي...</p>
        </section>
      )}

      {state?.status === "finished" && (
        <section className="card p-6 text-center">
          <div className="text-6xl">{me && me.rank <= 3 ? "🏆" : "🌙"}</div>
          <h2 className="mt-2 text-2xl font-black text-ramadan-deep">انتهت المسابقة!</h2>
          <p className="mt-2 text-xl font-black text-ramadan-gold-dark">
            ترتيبك: #{me?.rank ?? "—"} من {state.players.length} • {me?.score ?? 0} نقطة
          </p>
          <ol className="mt-4 space-y-1 text-right">
            {state.players.slice(0, 5).map((p) => (
              <li key={p.id} className={`flex justify-between rounded-xl px-3 py-1.5 font-bold ${p.id === me?.id ? "bg-ramadan-mint" : "bg-slate-50"}`}>
                <span>
                  {["🥇", "🥈", "🥉"][p.rank - 1] ?? `${p.rank}.`} {p.name}
                </span>
                <span>{p.score}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-ghost" onClick={() => leave()}>
              🚪 خروج
            </button>
            <Link href="/" className="btn-primary">
              🌙 العودة إلى الدرس
            </Link>
          </div>
        </section>
      )}

      <p className="mt-4 text-center">
        <button type="button" className="text-xs font-bold text-slate-400 underline-offset-4 hover:underline" onClick={() => leave()}>
          مغادرة المسابقة
        </button>
      </p>
    </main>
  );
}
