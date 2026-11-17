"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSound } from "@/components/lesson/useSound";
import { COMPETITION_QUESTIONS, type ResolvedQuestion } from "@/lib/competition-data";
import { SCHOOL_NAME, shuffle } from "@/lib/lesson-data";
import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from "@/lib/settings-types";

const STORAGE_KEY = "ramadan_team_quiz_v1";
const ICONS = ["🌙", "⭐", "🏮", "🕌", "📿", "🌟", "🌴", "🕋"];
const LETTERS = ["أ", "ب", "ج", "د"];
const OPTION_STYLES = [
  "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100",
  "border-sky-400 bg-sky-50 text-sky-900 hover:bg-sky-100",
  "border-rose-400 bg-rose-50 text-rose-900 hover:bg-rose-100",
];
const TEAM_GRADIENTS = ["from-emerald-500 to-ramadan-deep", "from-amber-400 to-orange-500"];
const CORRECT_POINTS = 10;
const STEAL_POINTS = 5;

type TeamIndex = 0 | 1;
interface Team {
  name: string;
  icon: string;
  score: number;
}
interface QuestionLog {
  index: number;
  starter: TeamIndex;
  winner: TeamIndex | null;
  points: number;
}
interface Game {
  phase: "question" | "result" | "finished";
  teams: [Team, Team];
  questions: ResolvedQuestion[];
  index: number;
  starter: TeamIndex;
  turn: TeamIndex;
  stealing: boolean;
  firstChoice: number | null;
  finalChoice: number | null;
  message: string;
  deadline: number | null;
  pausedRemaining: number | null;
  seconds: number;
  timerOn: boolean;
  log: QuestionLog[];
}

const other = (t: TeamIndex): TeamIndex => (t === 0 ? 1 : 0);
const stealSeconds = (g: Game) => Math.max(8, Math.round(g.seconds / 2));

function prepareQuestions(count: number): ResolvedQuestion[] {
  return shuffle(COMPETITION_QUESTIONS)
    .slice(0, count)
    .map((q) => {
      if (q.fixedOrder) return { prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain };
      const order = shuffle(q.options.map((_, i) => i));
      return { prompt: q.prompt, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer), explain: q.explain };
    });
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.6 + Math.random() * 2,
        color: ["#d4a017", "#0f766e", "#f59e0b", "#10b981", "#f43f5e", "#3b82f6"][i % 6],
        size: 7 + Math.random() * 8,
      })),
    [],
  );
  return (
    <div aria-hidden className="no-print pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-4 block animate-confetti rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
}

export default function TeamQuiz() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const sound = useSound(settings.sound);
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [setup, setSetup] = useState({
    names: ["مجموعة الهلال", "مجموعة النجمة"],
    icons: ["🌙", "⭐"],
    count: 12,
    seconds: DEFAULT_SETTINGS.competition.seconds,
    starter: "random" as "random" | "0" | "1",
    timerOn: true,
  });

  // تحميل الإعدادات واللعبة المحفوظة
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { settings?: unknown }) => {
        if (j?.settings) {
          const s = sanitizeSettings(j.settings);
          setSettings(s);
          setSetup((prev) => ({ ...prev, seconds: s.competition.seconds }));
        }
      })
      .catch(() => {});
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Game;
        if (saved && Array.isArray(saved.questions) && saved.questions.length > 0) setGame(saved);
      }
    } catch {
      /* تجاهل */
    }
    setReady(true);
  }, []);

  // حفظ اللعبة
  useEffect(() => {
    if (!ready) return;
    try {
      if (game) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* تجاهل */
    }
  }, [game, ready]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!game || game.phase !== "question" || !game.timerOn) return null;
    if (game.pausedRemaining !== null) return game.pausedRemaining;
    if (!game.deadline) return null;
    return Math.max(0, game.deadline - now);
  }, [game, now]);

  // انتهاء الوقت تلقائيًا
  useEffect(() => {
    if (!game || game.phase !== "question" || !game.timerOn || game.pausedRemaining !== null || !game.deadline) return;
    if (game.deadline - now > 0) return;
    if (!game.stealing) {
      sound.playWrong();
      setGame((g) => (g && g.phase === "question" && !g.stealing ? openStealState(g, null, "⏰ انتهى الوقت") : g));
    } else {
      sound.playWrong();
      setGame((g) => (g && g.phase === "question" && g.stealing ? finishState(g, null, false, "⏰ انتهى الوقت ولم تُجب المجموعتان") : g));
    }
  }, [game, now, sound]);

  function openStealState(g: Game, choice: number | null, reason: string): Game {
    const nextTurn = other(g.turn);
    return {
      ...g,
      turn: nextTurn,
      stealing: true,
      firstChoice: choice,
      message: `${reason} — الفرصة الآن لـ ${g.teams[nextTurn].icon} ${g.teams[nextTurn].name} (${STEAL_POINTS} نقاط)`,
      deadline: g.timerOn ? Date.now() + stealSeconds(g) * 1000 : null,
      pausedRemaining: null,
    };
  }

  function finishState(g: Game, choice: number | null, correct: boolean, message: string): Game {
    const points = correct ? (g.stealing ? STEAL_POINTS : CORRECT_POINTS) : 0;
    const teams: [Team, Team] = [{ ...g.teams[0] }, { ...g.teams[1] }];
    if (correct) teams[g.turn].score += points;
    return {
      ...g,
      phase: "result",
      teams,
      finalChoice: choice,
      message,
      deadline: null,
      pausedRemaining: null,
      log: [...g.log, { index: g.index, starter: g.starter, winner: correct ? g.turn : null, points }],
    };
  }

  function startGame() {
    const starter: TeamIndex = setup.starter === "random" ? (Math.random() < 0.5 ? 0 : 1) : (Number(setup.starter) as TeamIndex);
    const seconds = Math.min(90, Math.max(10, setup.seconds));
    setGame({
      phase: "question",
      teams: [
        { name: setup.names[0].trim() || "المجموعة الأولى", icon: setup.icons[0], score: 0 },
        { name: setup.names[1].trim() || "المجموعة الثانية", icon: setup.icons[1], score: 0 },
      ],
      questions: prepareQuestions(setup.count),
      index: 0,
      starter,
      turn: starter,
      stealing: false,
      firstChoice: null,
      finalChoice: null,
      message: "",
      deadline: setup.timerOn ? Date.now() + seconds * 1000 : null,
      pausedRemaining: null,
      seconds,
      timerOn: setup.timerOn,
      log: [],
    });
    sound.playClick();
  }

  function choose(i: number) {
    if (!game || game.phase !== "question") return;
    const q = game.questions[game.index];
    const team = game.teams[game.turn];
    if (i === q.answer) {
      const points = game.stealing ? STEAL_POINTS : CORRECT_POINTS;
      sound.playCorrect();
      setGame(finishState(game, i, true, `✅ أحسنتم يا ${team.icon} ${team.name}! +${points} نقاط`));
    } else if (!game.stealing) {
      sound.playWrong();
      setGame(openStealState(game, i, "❌ إجابة غير صحيحة"));
    } else {
      sound.playWrong();
      setGame(finishState(game, i, false, "❌ لم تُصب المجموعتان — الإجابة الصحيحة موضّحة بالأخضر"));
    }
  }

  function next() {
    if (!game) return;
    const nextIndex = game.index + 1;
    if (nextIndex >= game.questions.length) {
      sound.playComplete();
      setGame({ ...game, phase: "finished", deadline: null, pausedRemaining: null });
      return;
    }
    const starter = other(game.starter);
    sound.playClick();
    setGame({
      ...game,
      phase: "question",
      index: nextIndex,
      starter,
      turn: starter,
      stealing: false,
      firstChoice: null,
      finalChoice: null,
      message: "",
      deadline: game.timerOn ? Date.now() + game.seconds * 1000 : null,
      pausedRemaining: null,
    });
  }

  function skip() {
    if (!game || game.phase !== "question") return;
    setGame(finishState(game, null, false, "⏭ تم تخطي السؤال"));
  }

  function togglePause() {
    if (!game || game.phase !== "question" || !game.timerOn) return;
    if (game.pausedRemaining !== null) {
      setGame({ ...game, deadline: Date.now() + game.pausedRemaining, pausedRemaining: null });
    } else if (game.deadline) {
      setGame({ ...game, pausedRemaining: Math.max(0, game.deadline - Date.now()), deadline: null });
    }
  }

  function adjust(team: TeamIndex, delta: number) {
    if (!game) return;
    const teams: [Team, Team] = [{ ...game.teams[0] }, { ...game.teams[1] }];
    teams[team].score = Math.max(0, teams[team].score + delta);
    setGame({ ...game, teams });
    sound.playClick();
  }

  function reset() {
    if (game && game.phase !== "finished" && !window.confirm("إنهاء المسابقة الحالية وبدء مسابقة جديدة؟")) return;
    setGame(null);
  }

  if (!ready) return null;

  /* ---------------- شاشة الإعداد ---------------- */
  if (!game) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
        <section className="card animate-pop p-6 sm:p-8">
          <div className="text-center">
            <div className="text-6xl">👥🏆</div>
            <h1 className="mt-2 text-3xl font-black text-ramadan-deep">مسابقة الفصل بين مجموعتين</h1>
            <p className="mt-1 font-bold text-slate-500">
              {SCHOOL_NAME} • تُعرض على السبورة بدون أجهزة للطلاب — المعلم يضغط إجابة المجموعة
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((t) => (
              <div key={t} className={`rounded-3xl bg-gradient-to-br ${TEAM_GRADIENTS[t]} p-4 text-white`}>
                <p className="font-black">المجموعة {t === 0 ? "الأولى" : "الثانية"}</p>
                <input
                  value={setup.names[t]}
                  onChange={(e) => {
                    const names = [...setup.names];
                    names[t] = e.target.value;
                    setSetup({ ...setup, names });
                  }}
                  maxLength={24}
                  className="mt-2 w-full rounded-xl border-0 px-3 py-2 text-lg font-black text-ramadan-deep outline-none focus:ring-4 focus:ring-white/50"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => {
                        const icons = [...setup.icons];
                        icons[t] = ic;
                        setSetup({ ...setup, icons });
                      }}
                      className={`rounded-lg px-2 py-1 text-xl ${setup.icons[t] === ic ? "bg-white/90 ring-2 ring-white" : "bg-white/20 hover:bg-white/40"}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
              <span className="block font-black text-ramadan-deep">❓ عدد الأسئلة</span>
              <select
                value={setup.count}
                onChange={(e) => setSetup({ ...setup, count: Number(e.target.value) })}
                className="mt-2 w-full rounded-xl border-2 border-emerald-200 px-3 py-2 font-bold outline-none focus:border-ramadan-green"
              >
                {[6, 8, 10, 12, 14, 16].map((n) => (
                  <option key={n} value={n}>
                    {n} أسئلة
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
              <span className="flex items-center justify-between font-black text-ramadan-deep">
                <span>⏱️ زمن السؤال</span>
                <span className="text-sm text-slate-500">{setup.timerOn ? `${setup.seconds} ث` : "بدون مؤقت"}</span>
              </span>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={setup.seconds}
                disabled={!setup.timerOn}
                onChange={(e) => setSetup({ ...setup, seconds: Number(e.target.value) })}
                className="mt-2 w-full accent-emerald-600"
              />
              <label className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                <input type="checkbox" checked={setup.timerOn} onChange={(e) => setSetup({ ...setup, timerOn: e.target.checked })} />
                تفعيل المؤقت (ينتقل الدور تلقائيًا عند انتهاء الوقت)
              </label>
            </label>
            <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
              <span className="block font-black text-ramadan-deep">🎲 من يبدأ؟</span>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {[
                  { v: "random", l: "قرعة" },
                  { v: "0", l: setup.icons[0] },
                  { v: "1", l: setup.icons[1] },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setSetup({ ...setup, starter: o.v as "random" | "0" | "1" })}
                    className={`rounded-xl border-2 px-2 py-2 text-sm font-black ${
                      setup.starter === o.v ? "border-ramadan-green bg-ramadan-green text-white" : "border-emerald-200 text-ramadan-deep"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-ramadan-sand px-4 py-3 text-sm font-bold text-ramadan-deep">
            📏 القواعد: تتناوب المجموعتان على الأسئلة • الإجابة الصحيحة = {CORRECT_POINTS} نقاط • إذا أخطأت المجموعة تنتقل الفرصة للمجموعة الأخرى
            بـ {STEAL_POINTS} نقاط • يمكن للمعلم منح نقاط تشجيعية (+/−) في أي وقت.
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/teacher" className="btn-ghost">
              ↩ لوحة المعلم
            </Link>
            <button type="button" className="btn-primary px-10 py-4 text-2xl" onClick={startGame}>
              ▶ ابدأ المسابقة
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- النتائج النهائية ---------------- */
  if (game.phase === "finished") {
    const [a, b] = game.teams;
    const winner = a.score === b.score ? null : a.score > b.score ? 0 : 1;
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <Confetti />
        <section id="report-root" className="card p-6 text-center sm:p-8">
          <div className="text-6xl">🎉🏆🎉</div>
          <h1 className="mt-2 text-3xl font-black text-ramadan-deep">
            {winner === null ? "🤝 تعادل بين المجموعتين!" : `الفائز: ${game.teams[winner].icon} ${game.teams[winner].name}`}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {SCHOOL_NAME} • مسابقة صوم رمضان داخل الفصل • {game.questions.length} أسئلة
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {game.teams.map((t, i) => (
              <div key={i} className={`rounded-3xl border-4 p-6 ${winner === i ? "border-ramadan-gold bg-amber-50" : "border-emerald-100 bg-white"}`}>
                <div className="text-5xl">{t.icon}</div>
                <p className="mt-2 text-2xl font-black text-ramadan-deep">{t.name}</p>
                <p className="text-5xl font-black text-ramadan-gold-dark">{t.score}</p>
                <p className="text-xs font-bold text-slate-500">
                  إجابات صحيحة: {game.log.filter((l) => l.winner === i).length}
                </p>
              </div>
            ))}
          </div>

          <table className="mt-6 w-full border-collapse text-right text-sm">
            <thead>
              <tr className="bg-ramadan-mint text-ramadan-deep">
                <th className="border border-emerald-100 px-2 py-2">#</th>
                <th className="border border-emerald-100 px-2 py-2">السؤال</th>
                <th className="border border-emerald-100 px-2 py-2">بدأت</th>
                <th className="border border-emerald-100 px-2 py-2">أجابت صحيحًا</th>
                <th className="border border-emerald-100 px-2 py-2">النقاط</th>
              </tr>
            </thead>
            <tbody>
              {game.log.map((l) => (
                <tr key={l.index} className="odd:bg-white even:bg-emerald-50/40">
                  <td className="border border-emerald-100 px-2 py-1.5 text-center font-bold">{l.index + 1}</td>
                  <td className="border border-emerald-100 px-2 py-1.5 font-bold">{game.questions[l.index]?.prompt}</td>
                  <td className="border border-emerald-100 px-2 py-1.5 text-center">{game.teams[l.starter].icon}</td>
                  <td className="border border-emerald-100 px-2 py-1.5 text-center font-black">
                    {l.winner === null ? "—" : `${game.teams[l.winner].icon} ${game.teams[l.winner].name}`}
                  </td>
                  <td className="border border-emerald-100 px-2 py-1.5 text-center font-black text-ramadan-deep">{l.points}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              🖨️ طباعة النتائج
            </button>
            <button type="button" className="btn-gold" onClick={reset}>
              🔁 مسابقة جديدة
            </button>
            <Link href="/teacher" className="btn-ghost">
              ↩ لوحة المعلم
            </Link>
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- أثناء المسابقة ---------------- */
  const q = game.questions[game.index];
  const secondsLeft = remainingMs !== null ? Math.ceil(remainingMs / 1000) : null;
  const limitMs = (game.stealing ? stealSeconds(game) : game.seconds) * 1000;
  const progress = remainingMs !== null ? remainingMs / limitMs : 0;
  const isLast = game.index >= game.questions.length - 1;

  return (
    <div className="min-h-screen pattern-bg text-white">
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-3">
        <h1 className="text-xl font-black sm:text-2xl">👥 مسابقة الفصل — صوم رمضان</h1>
        <span className="rounded-full bg-white/15 px-4 py-1 text-lg font-black">
          السؤال {game.index + 1} / {game.questions.length}
        </span>
        <div className="flex items-center gap-2">
          {game.timerOn && game.phase === "question" && (
            <button type="button" onClick={togglePause} className="rounded-full bg-white/15 px-3 py-1 text-sm font-black hover:bg-white/25">
              {game.pausedRemaining !== null ? "▶️ متابعة" : "⏸️ إيقاف مؤقت"}
            </button>
          )}
          <button type="button" onClick={sound.toggleMute} className="rounded-full bg-white/15 px-3 py-1 text-sm font-black">
            {sound.muted ? "🔇" : "🔊"}
          </button>
          <button type="button" onClick={reset} className="rounded-full bg-white/15 px-3 py-1 text-sm font-black hover:bg-rose-500/60">
            ✖ إنهاء
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {/* لوحة المجموعتين */}
        <section className="mb-5 grid gap-4 sm:grid-cols-2">
          {game.teams.map((t, i) => {
            const active = game.phase === "question" && game.turn === i;
            return (
              <div
                key={i}
                className={`relative rounded-3xl bg-gradient-to-br ${TEAM_GRADIENTS[i]} p-5 transition ${active ? "scale-[1.02] ring-4 ring-white shadow-2xl" : "opacity-80"}`}
              >
                {active && (
                  <span className="absolute -top-3 right-5 animate-pulse rounded-full bg-white px-3 py-1 text-sm font-black text-ramadan-deep">
                    🎯 الدور الآن {game.stealing ? "(فرصة الإجابة)" : ""}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-black">
                    {t.icon} {t.name}
                  </p>
                  <p className="text-5xl font-black">{t.score}</p>
                </div>
                <div className="no-print mt-2 flex gap-2">
                  <button type="button" onClick={() => adjust(i as TeamIndex, 1)} className="rounded-lg bg-white/20 px-3 py-1 text-sm font-black hover:bg-white/35">
                    +1 تشجيعية
                  </button>
                  <button type="button" onClick={() => adjust(i as TeamIndex, -1)} className="rounded-lg bg-white/20 px-3 py-1 text-sm font-black hover:bg-white/35">
                    −1
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* السؤال */}
        <section className="card text-slate-800">
          <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-3">
            <span className="chip">
              {game.stealing ? `🔁 فرصة ${game.teams[game.turn].icon} ${game.teams[game.turn].name} — ${STEAL_POINTS} نقاط` : `🎯 دور ${game.teams[game.turn].icon} ${game.teams[game.turn].name} — ${CORRECT_POINTS} نقاط`}
            </span>
            {game.phase === "question" && secondsLeft !== null && (
              <span className={`text-4xl font-black ${secondsLeft <= 5 ? "animate-pulse text-rose-600" : "text-ramadan-deep"}`}>
                ⏱️ {secondsLeft}
                {game.pausedRemaining !== null && <span className="mr-2 text-base text-slate-400">(متوقف)</span>}
              </span>
            )}
            {game.phase === "result" && <span className="chip bg-emerald-100 text-emerald-800">✅ انتهى السؤال</span>}
          </div>
          {game.phase === "question" && game.timerOn && (
            <div className="h-3 bg-slate-100">
              <div className="h-full bg-gradient-to-l from-ramadan-green to-ramadan-gold transition-all duration-200" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          <div className="p-5 sm:p-7">
            <h2 className="text-center text-3xl font-black leading-relaxed text-ramadan-deep sm:text-4xl">{q.prompt}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer;
                const revealed = game.phase === "result";
                const wrongPicked = i === game.firstChoice || (revealed && i === game.finalChoice && !isAnswer);
                const disabled = game.phase !== "question" || i === game.firstChoice;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => choose(i)}
                    className={`flex items-center gap-3 rounded-2xl border-4 px-5 py-5 text-right text-2xl font-black transition active:scale-95 ${
                      revealed && isAnswer
                        ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-4 ring-emerald-300"
                        : wrongPicked
                          ? "border-rose-400 bg-rose-100 text-rose-700 line-through opacity-70"
                          : OPTION_STYLES[i % OPTION_STYLES.length]
                    } ${revealed && !isAnswer && !wrongPicked ? "opacity-50" : ""} disabled:cursor-not-allowed`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/80 text-xl">{revealed && isAnswer ? "✓" : wrongPicked ? "✗" : LETTERS[i]}</span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {game.message && (
              <p className={`mt-5 rounded-2xl px-4 py-3 text-center text-xl font-black ${game.phase === "result" && game.log[game.log.length - 1]?.winner !== null ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                {game.message}
              </p>
            )}
            {game.phase === "result" && q.explain && (
              <p className="mt-3 rounded-2xl bg-ramadan-sand px-4 py-3 text-center text-lg font-bold text-ramadan-deep">💡 {q.explain}</p>
            )}
          </div>

          <div className="no-print flex flex-wrap items-center justify-center gap-3 border-t border-emerald-100 bg-emerald-50/60 px-5 py-4">
            {game.phase === "question" ? (
              <button type="button" className="btn-ghost" onClick={skip}>
                ⏭ تخطي السؤال
              </button>
            ) : (
              <button type="button" className="btn-primary px-8 py-3 text-xl" onClick={next}>
                {isLast ? "🏁 إعلان النتائج" : "السؤال التالي ⬅"}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
