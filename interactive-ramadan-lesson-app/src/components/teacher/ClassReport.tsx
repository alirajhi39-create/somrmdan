"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatGregorian, formatHijri } from "@/lib/dates";
import {
  GRADE,
  LESSON_NUMBER,
  LESSON_PAGES,
  LESSON_TITLE_PLAIN,
  SCHOOL_NAME,
  SUBJECT,
  TOTAL_STATIONS,
  gradeLabel,
  starsFor,
} from "@/lib/lesson-data";
import type { Overview } from "@/lib/teacher-types";
import PrintToolbar from "./PrintToolbar";
import { AuthRequiredScreen, ErrorScreen, LoadingScreen } from "./Screens";
import { UnauthorizedError, clearToken, getStoredToken, teacherFetch } from "./teacher-client";

type State =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "error" }
  | { status: "ready"; data: Overview };

export default function ClassReport() {
  const searchParams = useSearchParams();
  const classroom = searchParams.get("classroom") ?? "";
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
        const res = await teacherFetch(`/api/teacher/overview?classroom=${encodeURIComponent(classroom)}`);
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { ok: boolean; data: Overview };
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
  }, [classroom, reloadKey]);

  if (state.status === "loading") return <LoadingScreen text="جارٍ تجهيز تقرير الفصل..." />;
  if (state.status === "unauthorized") return <AuthRequiredScreen />;
  if (state.status === "error") return <ErrorScreen onRetry={() => setReloadKey((k) => k + 1)} />;

  const data = state.data;
  const title = data.classroom ? `الفصل ${data.classroom}` : "جميع الفصول";

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <PrintToolbar
        filename={`تقرير-صوم-رمضان-${data.classroom || "جميع-الفصول"}.pdf`}
        backHref={data.classroom ? `/teacher?classroom=${encodeURIComponent(data.classroom)}` : "/teacher"}
      />

      <main id="report-root" dir="rtl" className="mx-auto max-w-5xl bg-white px-6 py-8 text-slate-800">
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

        <h1 className="mt-6 text-center text-3xl font-black text-[#0b4f3f]">تقرير متابعة الطلاب — {title}</h1>
        <p className="mt-1 text-center text-sm font-bold text-slate-500">
          الرحلة التعليمية التفاعلية لدرس «صوم رمضان» ({TOTAL_STATIONS} محطة)
        </p>

        <section className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "الطلاب", value: data.totals.students },
            { label: "المحاولات", value: data.totals.attempts },
            { label: "مكتملة", value: data.totals.completed },
            { label: "قيد التنفيذ", value: data.totals.inProgress },
            { label: "متوسط النسبة", value: `${data.totals.avgPercent}%` },
            { label: "شهادات", value: data.totals.certificates },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border-2 border-[#e6f4f1] bg-[#f7fbfa] p-3 text-center">
              <p className="text-2xl font-black text-[#0b4f3f]">{s.value}</p>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-black text-[#0b4f3f]">أولًا: نتائج الطلاب</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0f766e] text-white">
                <th className="border border-[#0f766e] px-2 py-2">#</th>
                <th className="border border-[#0f766e] px-2 py-2 text-right">اسم الطالب</th>
                <th className="border border-[#0f766e] px-2 py-2">الفصل</th>
                <th className="border border-[#0f766e] px-2 py-2">المحاولات</th>
                <th className="border border-[#0f766e] px-2 py-2">أفضل درجة</th>
                <th className="border border-[#0f766e] px-2 py-2">النسبة</th>
                <th className="border border-[#0f766e] px-2 py-2">التقدير</th>
                <th className="border border-[#0f766e] px-2 py-2">النجوم</th>
                <th className="border border-[#0f766e] px-2 py-2">الحالة</th>
                <th className="border border-[#0f766e] px-2 py-2">آخر نشاط</th>
              </tr>
            </thead>
            <tbody>
              {data.students.length === 0 && (
                <tr>
                  <td colSpan={10} className="border border-slate-200 px-2 py-6 text-center font-bold text-slate-400">
                    لا توجد بيانات بعد
                  </td>
                </tr>
              )}
              {data.students.map((s, i) => {
                const best = s.best;
                const completed = s.completedCount > 0;
                return (
                  <tr key={s.id} className="print-break-inside-avoid odd:bg-white even:bg-[#f7fbfa]">
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{i + 1}</td>
                    <td className="border border-slate-200 px-2 py-1.5 font-black">{s.name}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{s.classroom || "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{s.attempts.length}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-black text-[#0b4f3f]">
                      {best ? `${best.score}/${best.maxScore}` : "—"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{best ? `${best.percent}%` : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">
                      {best && completed ? gradeLabel(best.percent) : "—"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-amber-500">
                      {best ? "⭐".repeat(starsFor(best.score, best.maxScore)) : "—"}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-xs font-black">
                      {s.attempts.length === 0
                        ? "لم يبدأ"
                        : completed
                          ? "مكتمل ✅"
                          : `قيد التنفيذ (${s.latest?.stationsDone ?? 0}/${TOTAL_STATIONS})`}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-slate-500">
                      {formatDateTime(s.lastActivity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-8 print-break-inside-avoid">
          <h2 className="mb-3 text-xl font-black text-[#0b4f3f]">ثانيًا: تحليل أداء المحطات</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#d4a017] text-[#0b4f3f]">
                <th className="border border-[#d4a017] px-2 py-2">#</th>
                <th className="border border-[#d4a017] px-2 py-2 text-right">المحطة</th>
                <th className="border border-[#d4a017] px-2 py-2">أنجزها</th>
                <th className="border border-[#d4a017] px-2 py-2">من أول محاولة</th>
                <th className="border border-[#d4a017] px-2 py-2">متوسط المحاولات</th>
                <th className="border border-[#d4a017] px-2 py-2">متوسط النقاط %</th>
              </tr>
            </thead>
            <tbody>
              {data.stationStats.map((s) => (
                <tr key={s.key} className="odd:bg-white even:bg-[#fdf8ea]">
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{s.index + 1}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-black">
                    {s.icon} {s.title}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{s.answered}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">
                    {s.firstTryCorrect}
                    {s.answered ? ` (${Math.round((s.firstTryCorrect / s.answered) * 100)}%)` : ""}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-bold">{s.answered ? s.avgTries : "—"}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-black text-[#0b4f3f]">
                    {s.answered ? `${s.avgPercent}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-12 flex items-end justify-between text-sm font-black text-[#0b4f3f] print-break-inside-avoid">
          <div className="text-center">
            <p>معلم/ة المادة</p>
            <div className="mt-10 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
          <p className="text-xs font-bold text-slate-400">تم إنشاء التقرير آليًا من منصة الدرس التفاعلي</p>
          <div className="text-center">
            <p>مدير/ة المدرسة</p>
            <div className="mt-10 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
        </footer>
      </main>
    </div>
  );
}
