"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatDuration, formatGregorian, formatHijri } from "@/lib/dates";
import {
  GRADE,
  LESSON_NUMBER,
  LESSON_PAGES,
  LESSON_TITLE_PLAIN,
  SCHOOL_NAME,
  STATIONS,
  SUBJECT,
  TOTAL_STATIONS,
  gradeLabel,
  starsFor,
} from "@/lib/lesson-data";
import type { AttemptDetail } from "@/lib/teacher-types";
import PrintToolbar from "./PrintToolbar";
import { AuthRequiredScreen, ErrorScreen, LoadingScreen } from "./Screens";
import { UnauthorizedError, clearToken, getStoredToken, teacherFetch } from "./teacher-client";

type State =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "notfound" }
  | { status: "error" }
  | { status: "ready"; data: AttemptDetail };

const TYPE_LABELS: Record<string, string> = {
  learn: "تعلّم",
  mcq: "اختيار من متعدد",
  order: "ترتيب",
  fill: "إكمال فراغات",
  truefalse: "صح / خطأ",
};

export default function StudentReport({ attemptId }: { attemptId: number }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      if (!getStoredToken()) {
        setState({ status: "unauthorized" });
        return;
      }
      try {
        const res = await teacherFetch(`/api/teacher/attempts/${attemptId}`);
        if (res.status === 404) {
          if (!cancelled) setState({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { ok: boolean; data: AttemptDetail };
        if (!cancelled) setState({ status: "ready", data: json.data });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof UnauthorizedError) {
          clearToken();
          setState({ status: "unauthorized" });
        } else {
          setState({ status: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, reloadKey]);

  if (state.status === "loading") return <LoadingScreen text="جارٍ تجهيز تقرير الطالب..." />;
  if (state.status === "unauthorized") return <AuthRequiredScreen />;
  if (state.status === "notfound") return <ErrorScreen message="المحاولة غير موجودة" />;
  if (state.status === "error") return <ErrorScreen onRetry={() => setReloadKey((k) => k + 1)} />;

  const { attempt, student } = state.data;
  const stars = starsFor(attempt.score, attempt.maxScore);
  const resultByIndex = new Map(attempt.results.map((r) => [r.stationIndex, r]));
  const firstTry = attempt.results.filter((r) => r.correct).length;
  const totalTime = attempt.results.reduce((a, r) => a + r.timeSec, 0);
  const weakest = [...attempt.results]
    .filter((r) => r.points < r.maxPoints)
    .sort((a, b) => a.points / a.maxPoints - b.points / b.maxPoints)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <PrintToolbar filename={`تقرير-${student.name}-صوم-رمضان.pdf`} />

      <main id="report-root" dir="rtl" className="mx-auto max-w-4xl bg-white px-6 py-8 text-slate-800">
        <header className="flex items-start justify-between gap-4 border-b-4 border-[#0f766e] pb-4">
          <div>
            <p className="text-xl font-black text-[#0b4f3f]">🕌 {SCHOOL_NAME}</p>
            <p className="text-sm font-bold text-slate-500">
              {SUBJECT} • {GRADE}
            </p>
            <p className="text-sm font-bold text-slate-500">
              الدرس {LESSON_NUMBER}: {LESSON_TITLE_PLAIN} (ص {LESSON_PAGES})
            </p>
          </div>
          <div className="text-left text-sm font-bold text-slate-500">
            <p>{formatHijri(now)}</p>
            <p>{formatGregorian(now)}</p>
          </div>
        </header>

        <h1 className="mt-6 text-center text-3xl font-black text-[#0b4f3f]">تقرير أداء الطالب</h1>

        <section className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border-2 border-[#e6f4f1] bg-[#f7fbfa] p-4 text-sm font-bold sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">اسم الطالب</p>
            <p className="text-lg font-black text-[#0b4f3f]">{student.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">الفصل</p>
            <p className="text-lg font-black text-[#0b4f3f]">{student.classroom || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">تاريخ البدء</p>
            <p>{formatDateTime(attempt.startedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">تاريخ الإكمال</p>
            <p>{attempt.completedAt ? formatDateTime(attempt.completedAt) : "لم تكتمل بعد"}</p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "الدرجة", value: `${attempt.score} / ${attempt.maxScore}` },
            { label: "النسبة", value: `${attempt.percent}%` },
            { label: "التقدير", value: attempt.completedAt ? gradeLabel(attempt.percent) : "—" },
            { label: "المحطات المنجزة", value: `${attempt.stationsDone} / ${TOTAL_STATIONS}` },
            { label: "من أول محاولة", value: `${firstTry} / ${attempt.results.length || TOTAL_STATIONS}` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border-2 border-[#e6f4f1] p-3 text-center">
              <p className="text-xl font-black text-[#0b4f3f]">{s.value}</p>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>
        <p className="mt-3 text-center text-2xl text-amber-500">{"⭐".repeat(stars)}</p>
        <p className="text-center text-xs font-bold text-slate-500">
          المدة الكلية: {formatDuration(attempt.durationSec ?? totalTime)}
          {attempt.completedAt && attempt.certificateName ? ` • صدرت الشهادة باسم: ${attempt.certificateName}` : ""}
        </p>

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black text-[#0b4f3f]">تفاصيل المحطات</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0f766e] text-white">
                <th className="border border-[#0f766e] px-2 py-2">#</th>
                <th className="border border-[#0f766e] px-2 py-2 text-right">المحطة</th>
                <th className="border border-[#0f766e] px-2 py-2">النوع</th>
                <th className="border border-[#0f766e] px-2 py-2">النتيجة</th>
                <th className="border border-[#0f766e] px-2 py-2">المحاولات</th>
                <th className="border border-[#0f766e] px-2 py-2">النقاط</th>
                <th className="border border-[#0f766e] px-2 py-2">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s, i) => {
                const r = resultByIndex.get(i);
                return (
                  <tr key={s.key} className="odd:bg-white even:bg-[#f7fbfa]">
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{i + 1}</td>
                    <td className="border border-slate-200 px-2 py-1.5 font-black">
                      {s.icon} {s.title}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-slate-500">
                      {TYPE_LABELS[s.type]}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-black">
                      {!r ? (
                        <span className="text-slate-400">لم تُنجز</span>
                      ) : r.correct ? (
                        <span className="text-emerald-700">✅ من أول محاولة</span>
                      ) : (
                        <span className="text-amber-700">🔁 بعد المحاولة</span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{r ? r.tries : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-black text-[#0b4f3f]">
                      {r ? `${r.points} / ${r.maxPoints}` : `— / ${s.maxPoints}`}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-slate-500">
                      {r ? formatDuration(r.timeSec) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-6 rounded-2xl border-2 border-[#d4a017]/50 bg-[#fdf8ea] p-4 print-break-inside-avoid">
          <h2 className="text-lg font-black text-[#0b4f3f]">💡 ملاحظات وتوصيات</h2>
          {weakest.length === 0 ? (
            <p className="mt-1 text-sm font-bold text-slate-600">
              أداء ممتاز، أجاب الطالب عن جميع المحطات المنجزة بدرجة كاملة. يُنصح بتشجيعه ومنحه الشهادة أمام زملائه.
            </p>
          ) : (
            <ul className="mt-1 list-inside list-disc text-sm font-bold text-slate-600">
              {weakest.map((w) => (
                <li key={w.stationIndex}>
                  يُنصح بمراجعة محطة «{w.stationTitle}» ({w.points}/{w.maxPoints} نقطة بعد {w.tries} محاولات).
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-3">
            <p className="text-xs font-bold text-slate-400">ملاحظات المعلم:</p>
            <div className="h-16" />
          </div>
        </section>

        <footer className="mt-10 flex items-end justify-between text-sm font-black text-[#0b4f3f] print-break-inside-avoid">
          <div className="text-center">
            <p>معلم/ة المادة</p>
            <div className="mt-10 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
          <p className="text-xs font-bold text-slate-400">رقم المحاولة #{attempt.id}</p>
          <div className="text-center">
            <p>ولي الأمر</p>
            <div className="mt-10 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
        </footer>
      </main>
    </div>
  );
}
