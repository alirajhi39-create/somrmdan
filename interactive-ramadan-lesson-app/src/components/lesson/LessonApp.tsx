"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  GRADE,
  LESSON_NUMBER,
  LESSON_PAGES,
  LESSON_TITLE,
  LESSON_TOPICS,
  SCHOOL_NAME,
  STATIONS,
  TOTAL_MAX_POINTS,
  TOTAL_STATIONS,
  gradeLabel,
  percentOf,
  starsFor,
} from "@/lib/lesson-data";
import Certificate from "./Certificate";
import Header from "./Header";
import HeroIllustration from "./HeroIllustration";
import ProgressBar from "./ProgressBar";
import StationRunner from "./StationRunner";
import type { StationOutcome } from "./types";
import { useSound } from "./useSound";

const STORAGE_KEY = "alaroos-ramadan-progress-v1";
const CLASSROOMS = ["٣/١", "٣/٢", "٣/٣", "٣/٤", "٣/٥"];
const CONFETTI_COLORS = ["#d4a017", "#0f766e", "#f59e0b", "#10b981", "#f43f5e", "#3b82f6"];

interface StationRecord extends StationOutcome {
  timeSec: number;
}

interface Progress {
  attemptId: number | null;
  name: string;
  classroom: string;
  current: number;
  records: Record<number, StationRecord>;
  startedAt: number;
}

type Phase = "hero" | "start" | "play" | "done";

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.6 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
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
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LessonApp({ dbReady }: { dbReady: boolean }) {
  const sound = useSound();
  const [phase, setPhase] = useState<Phase>("hero");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saved, setSaved] = useState<Progress | null>(null);
  const [starting, setStarting] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [certName, setCertName] = useState("");
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const playTopRef = useRef<HTMLDivElement | null>(null);

  // استرجاع تقدم محفوظ (للمتابعة بعد إغلاق الصفحة)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Progress;
        if (parsed && typeof parsed.current === "number" && parsed.current < TOTAL_STATIONS && parsed.name) {
          setSaved(parsed);
        }
      }
    } catch {
      /* تجاهل */
    }
  }, []);

  useEffect(() => {
    if (phase === "play" && progress) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        /* تجاهل */
      }
    }
  }, [phase, progress]);

  useEffect(() => {
    if (!showConfetti) return;
    const t = window.setTimeout(() => setShowConfetti(false), 7000);
    return () => window.clearTimeout(t);
  }, [showConfetti]);

  const score = useMemo(
    () => (progress ? Object.values(progress.records).reduce((sum, r) => sum + r.points, 0) : 0),
    [progress],
  );
  const doneIndexes = useMemo(() => (progress ? Object.keys(progress.records).map(Number) : []), [progress]);

  async function startJourney(name: string, classroom: string) {
    setStarting(true);
    const res = await postJson<{ ok: boolean; attemptId: number }>("/api/attempts/start", { name, classroom });
    setStarting(false);
    if (!res?.ok) setSyncError(true);
    const p: Progress = {
      attemptId: res?.ok ? res.attemptId : null,
      name,
      classroom,
      current: 0,
      records: {},
      startedAt: Date.now(),
    };
    setProgress(p);
    setCertName(name);
    setPhase("play");
    sound.playClick();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resumeJourney() {
    if (!saved) return;
    setProgress(saved);
    setCertName(saved.name);
    setPhase("play");
    sound.playClick();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStationComplete(index: number, outcome: StationRecord) {
    setProgress((p) => (p ? { ...p, records: { ...p.records, [index]: outcome } } : p));
    const attemptId = progress?.attemptId;
    if (attemptId) {
      void postJson<{ ok: boolean }>(`/api/attempts/${attemptId}/station`, {
        stationIndex: index,
        stationKey: STATIONS[index].key,
        stationTitle: STATIONS[index].title,
        correct: outcome.tries === 1,
        tries: outcome.tries,
        points: outcome.points,
        maxPoints: STATIONS[index].maxPoints,
        timeSec: outcome.timeSec,
      }).then((r) => {
        if (!r?.ok) setSyncError(true);
      });
    }
  }

  async function finishJourney(p: Progress) {
    const durationSec = Math.round((Date.now() - p.startedAt) / 1000);
    setCompletedAt(new Date());
    setPhase("done");
    setShowConfetti(true);
    sound.playComplete();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* تجاهل */
    }
    setSaved(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (p.attemptId) {
      const r = await postJson<{ ok: boolean }>(`/api/attempts/${p.attemptId}/complete`, {
        certificateName: p.name,
        durationSec,
      });
      if (!r?.ok) setSyncError(true);
    }
  }

  function handleNext() {
    if (!progress) return;
    const nextIndex = progress.current + 1;
    if (nextIndex >= TOTAL_STATIONS) {
      void finishJourney(progress);
      return;
    }
    setProgress({ ...progress, current: nextIndex });
    sound.playClick();
    window.setTimeout(() => playTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function syncCertificateName() {
    if (!progress?.attemptId || !certName.trim()) return;
    await postJson(`/api/attempts/${progress.attemptId}/complete`, {
      certificateName: certName.trim(),
      durationSec: completedAt ? Math.round((completedAt.getTime() - progress.startedAt) / 1000) : undefined,
    });
  }

  function restart() {
    setProgress(null);
    setCompletedAt(null);
    setSyncError(false);
    setPhase("hero");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function downloadCertificate() {
    const el = document.getElementById("certificate");
    if (!el) return;
    setPdfBusy(true);
    try {
      const { downloadElementAsPdf } = await import("@/lib/pdf-export");
      await downloadElementAsPdf(el, `شهادة-بطل-صوم-رمضان-${certName.trim() || "الطالب"}.pdf`, "landscape");
    } catch (error) {
      console.error(error);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header sound={sound} />
      {showConfetti && <Confetti />}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {phase === "hero" && (
          <HeroSection
            onStart={() => {
              setPhase("start");
              sound.playClick();
            }}
            onResume={saved ? resumeJourney : undefined}
            savedName={saved?.name}
            savedStation={saved ? saved.current + 1 : undefined}
          />
        )}

        {phase === "start" && (
          <StartForm
            busy={starting}
            dbReady={dbReady}
            onBack={() => setPhase("hero")}
            onSubmit={(name, classroom) => void startJourney(name, classroom)}
          />
        )}

        {phase === "play" && progress && (
          <div className="space-y-5" ref={playTopRef}>
            <ProgressBar
              current={progress.current}
              total={TOTAL_STATIONS}
              doneIndexes={doneIndexes}
              score={score}
              maxScore={TOTAL_MAX_POINTS}
              studentName={progress.name}
            />
            {syncError && (
              <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
                ⚠️ تعذّر حفظ النتائج على الخادم مؤقتًا — يمكنك متابعة الرحلة وسنحاول الحفظ في المحطات التالية.
              </p>
            )}
            <StationRunner
              key={progress.current}
              station={STATIONS[progress.current]}
              index={progress.current}
              total={TOTAL_STATIONS}
              sound={sound}
              onComplete={(o) => handleStationComplete(progress.current, o)}
              onNext={handleNext}
            />
          </div>
        )}

        {phase === "done" && progress && (
          <DoneSection
            progress={progress}
            score={score}
            completedAt={completedAt ?? new Date()}
            certName={certName}
            onCertNameChange={setCertName}
            onCertNameBlur={() => void syncCertificateName()}
            onPrint={() => window.print()}
            onDownload={() => void downloadCertificate()}
            pdfBusy={pdfBusy}
            onRestart={restart}
            syncError={syncError}
          />
        )}
      </main>

      <footer className="no-print mt-10 border-t border-emerald-100 bg-white/70 py-6 text-center text-sm font-bold text-slate-500">
        <p>
          🌙 {SCHOOL_NAME} • {GRADE} • الدرس {LESSON_NUMBER}: {LESSON_TITLE} • ص {LESSON_PAGES}
        </p>
        <p className="mt-1">
          <Link href="/teacher" className="text-ramadan-green underline-offset-4 hover:underline">
            لوحة المعلم
          </Link>
        </p>
      </footer>
    </div>
  );
}

/* ------------------------- قسم الترحيب ------------------------- */
function HeroSection({
  onStart,
  onResume,
  savedName,
  savedStation,
}: {
  onStart: () => void;
  onResume?: () => void;
  savedName?: string;
  savedStation?: number;
}) {
  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-ramadan-gold/10" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-ramadan-green/10" />
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-5 text-center lg:text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-ramadan-mint px-4 py-1.5 text-sm font-black text-ramadan-deep">
              📘 الدرس {LESSON_NUMBER} • {GRADE} • ص {LESSON_PAGES}
            </span>
            <h1 className="font-amiri text-5xl font-bold leading-tight text-ramadan-deep sm:text-6xl lg:text-7xl">
              {LESSON_TITLE}
            </h1>
            <p className="text-lg font-bold leading-loose text-slate-600 sm:text-xl">
              رحلة تعليمية تفاعلية من <span className="rounded-lg bg-ramadan-gold/20 px-2 text-ramadan-gold-dark">12 محطة</span>:
              اكتشف، العب، فكّر، وأجب… ثم احصل على شهادة <span className="font-black text-ramadan-green">«بطل صوم رمضان»</span>!
            </p>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {LESSON_TOPICS.map((t) => (
                <span key={t.label} className="chip px-3 py-1.5 text-sm">
                  <span className="text-lg">{t.icon}</span> {t.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
              <button type="button" className="btn-primary px-8 py-4 text-xl" onClick={onStart}>
                🚀 ابدأ الرحلة
              </button>
              {onResume && (
                <button type="button" className="btn-gold" onClick={onResume}>
                  ▶️ متابعة رحلة {savedName} (المحطة {savedStation})
                </button>
              )}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <HeroIllustration className="h-auto w-full animate-float rounded-[2rem] shadow-xl shadow-emerald-900/10" />
            <span className="absolute -right-3 -top-3 animate-twinkle text-4xl">✨</span>
            <span className="absolute -bottom-4 -left-2 animate-twinkle text-4xl [animation-delay:1s]">⭐</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: "🔍", title: "اكتشف", text: "بطاقات شرح مبسطة للآية والحديث ومعنى الصوم" },
          { icon: "🎮", title: "العب", text: "ترتيب كلمات، سحب وإفلات، صح أم خطأ" },
          { icon: "🤔", title: "فكّر", text: "أسئلة اختيار من متعدد مع تعزيز فوري بالصوت" },
          { icon: "🏆", title: "احصل على الشهادة", text: "شهادة «بطل صوم رمضان» قابلة للطباعة" },
        ].map((c) => (
          <div key={c.title} className="card p-5 text-center">
            <div className="text-4xl">{c.icon}</div>
            <p className="mt-2 text-lg font-black text-ramadan-deep">{c.title}</p>
            <p className="text-sm font-bold text-slate-500">{c.text}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <p className="mb-4 text-center text-xl font-black text-ramadan-deep">🗺️ خريطة المحطات الاثنتي عشرة</p>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ramadan-mint text-sm font-black text-ramadan-deep">
                {i + 1}
              </span>
              <span className="text-2xl">{s.icon}</span>
              <span className="font-extrabold text-slate-700">{s.title}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ------------------------- نموذج البدء ------------------------- */
function StartForm({
  busy,
  dbReady,
  onBack,
  onSubmit,
}: {
  busy: boolean;
  dbReady: boolean;
  onBack: () => void;
  onSubmit: (name: string, classroom: string) => void;
}) {
  const [name, setName] = useState("");
  const [classroom, setClassroom] = useState(CLASSROOMS[0]);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2) {
      setError("اكتب اسمك الكامل من فضلك (حرفان على الأقل)");
      return;
    }
    const cls = classroom === "other" ? other.trim() : classroom;
    setError("");
    onSubmit(cleanName, cls);
  }

  return (
    <section className="card mx-auto max-w-xl animate-pop p-6 sm:p-8">
      <div className="text-center">
        <div className="text-6xl">🧒👧</div>
        <h2 className="mt-2 text-3xl font-black text-ramadan-deep">مَنْ بَطَلُنَا الْيَوْمَ؟</h2>
        <p className="mt-1 font-bold text-slate-500">اكتب اسمك واختر فصلك لنبدأ الرحلة ونحفظ نتيجتك للمعلم</p>
      </div>

      {!dbReady && (
        <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
          ⚠️ قاعدة البيانات غير متصلة حاليًا؛ يمكنك اللعب لكن قد لا تُحفظ النتائج.
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="student-name" className="mb-1 block font-black text-ramadan-deep">
            ✏️ الاسم
          </label>
          <input
            id="student-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: محمد عبدالله"
            autoComplete="name"
            maxLength={60}
            className="w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 text-xl font-bold outline-none transition focus:border-ramadan-green focus:ring-4 focus:ring-emerald-100"
          />
        </div>
        <div>
          <p className="mb-2 font-black text-ramadan-deep">🏫 الفصل</p>
          <div className="flex flex-wrap gap-2">
            {[...CLASSROOMS, "other"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassroom(c)}
                className={`rounded-xl border-2 px-4 py-2 font-black transition ${
                  classroom === c
                    ? "border-ramadan-green bg-ramadan-green text-white"
                    : "border-emerald-200 bg-white text-ramadan-deep hover:bg-ramadan-mint"
                }`}
              >
                {c === "other" ? "أخرى" : c}
              </button>
            ))}
          </div>
          {classroom === "other" && (
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="اكتب اسم الفصل"
              maxLength={20}
              className="mt-3 w-full rounded-2xl border-2 border-emerald-200 px-4 py-2 text-lg font-bold outline-none focus:border-ramadan-green"
            />
          )}
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2 font-bold text-rose-700">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onBack}>
            ↩ رجوع
          </button>
          <button type="submit" className="btn-primary px-8" disabled={busy}>
            {busy ? "⏳ لحظة..." : "🌙 هيّا نبدأ!"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------------------- شاشة التهنئة والشهادة ------------------------- */
function DoneSection({
  progress,
  score,
  completedAt,
  certName,
  onCertNameChange,
  onCertNameBlur,
  onPrint,
  onDownload,
  pdfBusy,
  onRestart,
  syncError,
}: {
  progress: Progress;
  score: number;
  completedAt: Date;
  certName: string;
  onCertNameChange: (v: string) => void;
  onCertNameBlur: () => void;
  onPrint: () => void;
  onDownload: () => void;
  pdfBusy: boolean;
  onRestart: () => void;
  syncError: boolean;
}) {
  const percent = percentOf(score, TOTAL_MAX_POINTS);
  const stars = starsFor(score, TOTAL_MAX_POINTS);
  const records = Object.values(progress.records);
  const firstTry = records.filter((r) => r.tries === 1).length;
  const totalSec = Math.round((completedAt.getTime() - progress.startedAt) / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  return (
    <div className="space-y-6">
      <section className="card no-print animate-pop p-6 text-center sm:p-8">
        <div className="text-6xl">🎉🏆🎉</div>
        <h2 className="mt-3 text-3xl font-black text-ramadan-deep sm:text-4xl">
          مُبَارَكٌ يَا {progress.name}! أَتْمَمْتَ الرِّحْلَةَ
        </h2>
        <p className="mt-2 text-lg font-bold text-slate-600">
          أَصْبَحْتَ الآنَ <span className="font-black text-ramadan-green">بَطَلَ صَوْمِ رَمَضَانَ</span> — تَقْدِيرُكَ:{" "}
          <span className="font-black text-ramadan-gold-dark">{gradeLabel(percent)}</span>
        </p>
        <p className="mt-2 text-4xl">{"⭐".repeat(stars)}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "النِّقَاطُ", value: `${score} / ${TOTAL_MAX_POINTS}`, icon: "🏅" },
            { label: "النِّسْبَةُ", value: `${percent}%`, icon: "📊" },
            { label: "مِنْ أَوَّلِ مُحَاوَلَةٍ", value: `${firstTry} / ${TOTAL_STATIONS}`, icon: "🥇" },
            { label: "الْوَقْتُ", value: `${minutes} د ${seconds} ث`, icon: "⏱️" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-ramadan-mint p-4">
              <div className="text-2xl">{s.icon}</div>
              <p className="text-2xl font-black text-ramadan-deep">{s.value}</p>
              <p className="text-sm font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {syncError && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
            ⚠️ لم يتم حفظ بعض النتائج على الخادم. يمكنك طباعة الشهادة الآن وإبلاغ المعلم.
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <label htmlFor="cert-name" className="font-black text-ramadan-deep">
            ✍️ الاسم كما سيظهر في الشهادة
          </label>
          <input
            id="cert-name"
            value={certName}
            onChange={(e) => onCertNameChange(e.target.value)}
            onBlur={onCertNameBlur}
            maxLength={60}
            className="w-full max-w-md rounded-2xl border-2 border-emerald-200 px-4 py-3 text-center text-xl font-bold outline-none focus:border-ramadan-green focus:ring-4 focus:ring-emerald-100"
          />
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button type="button" className="btn-primary" onClick={onPrint}>
              🖨️ طباعة الشهادة
            </button>
            <button type="button" className="btn-gold" onClick={onDownload} disabled={pdfBusy}>
              {pdfBusy ? "⏳ جارٍ التجهيز..." : "⬇️ تحميل PDF"}
            </button>
            <button type="button" className="btn-ghost" onClick={onRestart}>
              🔁 رحلة جديدة
            </button>
          </div>
        </div>
      </section>

      <Certificate
        name={certName}
        classroom={progress.classroom}
        score={score}
        maxScore={TOTAL_MAX_POINTS}
        date={completedAt}
      />

      <section className="card no-print p-6">
        <p className="mb-3 text-xl font-black text-ramadan-deep">📋 مُلَخَّصُ المَحَطَّاتِ</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STATIONS.map((s, i) => {
            const r = progress.records[i];
            return (
              <li key={s.key} className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white px-3 py-2">
                <span className="flex items-center gap-2 font-extrabold text-slate-700">
                  <span className="text-xl">{s.icon}</span> {s.title}
                </span>
                <span className="chip">
                  {r ? `${r.points}/${s.maxPoints}` : "—"} {r?.tries === 1 ? "🥇" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
