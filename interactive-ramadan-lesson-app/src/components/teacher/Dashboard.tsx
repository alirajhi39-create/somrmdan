"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime, formatDuration } from "@/lib/dates";
import { GRADE, LESSON_NUMBER, LESSON_TITLE_PLAIN, SCHOOL_NAME, TOTAL_STATIONS, gradeLabel, starsFor } from "@/lib/lesson-data";
import type { AttemptView, Overview, StudentView } from "@/lib/teacher-types";
import DbStatusBadge from "./DbStatusBadge";
import DeleteStudentButton from "./DeleteStudentButton";
import { teacherFetch } from "./teacher-client";

function statusOf(student: StudentView): { label: string; className: string } {
  if (student.attempts.length === 0) return { label: "لم يبدأ", className: "bg-slate-100 text-slate-600" };
  if (student.completedCount > 0) return { label: "أكمل الرحلة ✅", className: "bg-emerald-100 text-emerald-800" };
  const latest = student.latest;
  return {
    label: `قيد التنفيذ ⏳ (${latest?.stationsDone ?? 0}/${TOTAL_STATIONS})`,
    className: "bg-amber-100 text-amber-800",
  };
}

function ExportCsvButton({ classroom }: { classroom: string }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await teacherFetch(`/api/teacher/export?classroom=${encodeURIComponent(classroom)}`);
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير-صوم-رمضان${classroom ? "-" + classroom : ""}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("تعذر تصدير الملف، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={busy}
      className="rounded-xl bg-white px-4 py-2 font-black text-ramadan-deep hover:bg-emerald-50 disabled:opacity-60"
    >
      {busy ? "⏳..." : "⬇️ تصدير Excel (CSV)"}
    </button>
  );
}

function AttemptCard({ attempt, index }: { attempt: AttemptView; index: number }) {
  const resultByIndex = new Map(attempt.results.map((r) => [r.stationIndex, r]));
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-black text-ramadan-deep">
          المحاولة {index + 1} <span className="text-xs font-bold text-slate-400">#{attempt.id}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
          <span>🕒 {formatDateTime(attempt.startedAt)}</span>
          <span>⏱️ {formatDuration(attempt.durationSec)}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-black ${
              attempt.completedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {attempt.completedAt ? "مكتملة" : "قيد التنفيذ"}
          </span>
          <span className="rounded-full bg-ramadan-mint px-2 py-0.5 text-xs font-black text-ramadan-deep">
            {attempt.score}/{attempt.maxScore} ({attempt.percent}%)
          </span>
          <Link
            href={`/teacher/report/${attempt.id}`}
            className="rounded-xl bg-ramadan-green px-3 py-1 text-xs font-black text-white hover:bg-ramadan-deep"
          >
            📄 تقرير الطالب PDF
          </Link>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: TOTAL_STATIONS }, (_, i) => {
          const r = resultByIndex.get(i);
          return (
            <div
              key={i}
              title={r ? `${r.stationTitle} — ${r.tries} محاولة` : "لم تُنجز"}
              className={`rounded-xl border px-2 py-1.5 text-center text-xs font-black ${
                !r
                  ? "border-slate-200 bg-slate-50 text-slate-400"
                  : r.correct
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <div className="text-base">{r?.icon ?? "⬜"}</div>
              <div>
                {i + 1}. {r ? `${r.points}/${r.maxPoints}` : "—"}
              </div>
              {r && <div className="text-[10px] font-bold opacity-80">{r.correct ? "من أول مرة" : `${r.tries} محاولات`}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  data: Overview;
  refreshing: boolean;
  onLogout: () => void;
  onRefresh: () => void;
}

export default function Dashboard({ data, refreshing, onLogout, onRefresh }: Props) {
  const query = data.classroom ? `?classroom=${encodeURIComponent(data.classroom)}` : "";
  const { totals } = data;

  return (
    <div className="min-h-screen">
      <header className="pattern-bg text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">👨‍🏫 لوحة المعلم — متابعة الطلاب</h1>
            <p className="mt-1 text-sm font-bold text-emerald-100">
              {SCHOOL_NAME} • {GRADE} • الدرس {LESSON_NUMBER}: {LESSON_TITLE_PLAIN}
            </p>
            <div className="mt-2">
              <DbStatusBadge light />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="rounded-xl border-2 border-white/40 px-4 py-2 font-black hover:bg-white/10">
              🏠 صفحة الطالب
            </Link>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-xl border-2 border-white/40 px-4 py-2 font-black hover:bg-white/10 disabled:opacity-60"
            >
              {refreshing ? "⏳ تحديث..." : "🔄 تحديث"}
            </button>
            <Link
              href={`/teacher/report${query}`}
              className="rounded-xl bg-ramadan-gold px-4 py-2 font-black text-ramadan-deep hover:bg-amber-400"
            >
              🖨️ تقرير الفصل PDF
            </Link>
            <ExportCsvButton classroom={data.classroom} />
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border-2 border-white/40 px-4 py-2 font-black text-white transition hover:bg-white/10"
            >
              🚪 خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* تصفية حسب الفصل */}
        <section className="card flex flex-wrap items-center gap-2 p-4">
          <span className="font-black text-ramadan-deep">🏫 الفصل:</span>
          <Link
            href="/teacher"
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-black ${
              !data.classroom ? "border-ramadan-green bg-ramadan-green text-white" : "border-emerald-200 bg-white text-ramadan-deep"
            }`}
          >
            الكل
          </Link>
          {data.classrooms.map((c) => (
            <Link
              key={c}
              href={`/teacher?classroom=${encodeURIComponent(c)}`}
              className={`rounded-xl border-2 px-3 py-1.5 text-sm font-black ${
                data.classroom === c
                  ? "border-ramadan-green bg-ramadan-green text-white"
                  : "border-emerald-200 bg-white text-ramadan-deep hover:bg-ramadan-mint"
              }`}
            >
              {c}
            </Link>
          ))}
          {data.classrooms.length === 0 && <span className="text-sm font-bold text-slate-400">لا توجد فصول بعد</span>}
        </section>

        {/* الإحصاءات */}
        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: "🧒", label: "الطلاب", value: totals.students },
            { icon: "🎯", label: "المحاولات", value: totals.attempts },
            { icon: "✅", label: "رحلات مكتملة", value: totals.completed },
            { icon: "⏳", label: "قيد التنفيذ", value: totals.inProgress },
            { icon: "📊", label: "متوسط النسبة", value: `${totals.avgPercent}%` },
            { icon: "🏆", label: "شهادات صادرة", value: totals.certificates },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl">{s.icon}</div>
              <p className="text-2xl font-black text-ramadan-deep">{s.value}</p>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* تحليل المحطات */}
        <section className="card p-5">
          <h2 className="text-xl font-black text-ramadan-deep">📍 تحليل أداء المحطات</h2>
          <p className="mb-4 text-sm font-bold text-slate-500">
            يساعدك على معرفة المحطات التي يجد فيها الطلاب صعوبة (نسبة النقاط المحققة ومن أجاب من أول محاولة).
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.stationStats.map((s) => (
              <div key={s.key} className="rounded-2xl border border-emerald-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-black text-slate-700">
                    <span className="text-xl">{s.icon}</span>
                    <span>
                      {s.index + 1}. {s.title}
                    </span>
                  </p>
                  <span className="text-sm font-black text-ramadan-deep">{s.answered ? `${s.avgPercent}%` : "—"}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      s.avgPercent >= 80 ? "bg-emerald-500" : s.avgPercent >= 50 ? "bg-amber-400" : "bg-rose-400"
                    }`}
                    style={{ width: `${s.answered ? s.avgPercent : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  أنجزها {s.answered} • من أول محاولة {s.firstTryCorrect}
                  {s.answered ? ` (${Math.round((s.firstTryCorrect / s.answered) * 100)}%)` : ""} • متوسط المحاولات{" "}
                  {s.answered ? s.avgTries : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* جدول الطلاب */}
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 px-5 py-4">
            <h2 className="text-xl font-black text-ramadan-deep">🧒 الطلاب ({data.students.length})</h2>
            <p className="text-sm font-bold text-slate-500">اضغط على «التفاصيل» لعرض نتائج كل محطة</p>
          </div>

          {data.students.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl">🌙</div>
              <p className="mt-3 text-lg font-black text-slate-600">لا يوجد طلاب بعد</p>
              <p className="text-sm font-bold text-slate-400">عندما يبدأ الطلاب الرحلة ستظهر نتائجهم هنا تلقائيًا.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-right text-sm">
                <thead className="bg-ramadan-mint text-xs font-black text-ramadan-deep">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">الاسم</th>
                    <th className="px-4 py-3">الفصل</th>
                    <th className="px-4 py-3">المحاولات</th>
                    <th className="px-4 py-3">أفضل نتيجة</th>
                    <th className="px-4 py-3">التقدير</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">آخر نشاط</th>
                    <th className="px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => {
                    const status = statusOf(s);
                    const best = s.best;
                    const reportAttempt = best ?? s.latest;
                    return (
                      <tr key={s.id} className="border-t border-emerald-50 align-top odd:bg-white even:bg-emerald-50/30">
                        <td className="px-4 py-3 font-bold text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-800">{s.name}</p>
                          <details className="mt-1">
                            <summary className="cursor-pointer select-none text-xs font-black text-ramadan-green hover:underline">
                              ▾ التفاصيل
                            </summary>
                            <div className="mt-2 w-[min(78vw,900px)] space-y-2">
                              {s.attempts.length === 0 && (
                                <p className="text-xs font-bold text-slate-400">لا توجد محاولات بعد.</p>
                              )}
                              {s.attempts.map((a, idx) => (
                                <AttemptCard key={a.id} attempt={a} index={s.attempts.length - idx - 1} />
                              ))}
                            </div>
                          </details>
                        </td>
                        <td className="px-4 py-3 font-bold">{s.classroom || "—"}</td>
                        <td className="px-4 py-3 font-bold">{s.attempts.length}</td>
                        <td className="px-4 py-3 font-black text-ramadan-deep">
                          {best ? (
                            <>
                              {best.score}/{best.maxScore}{" "}
                              <span className="text-xs text-slate-500">({best.percent}%)</span>
                              <div className="text-amber-500">{"⭐".repeat(starsFor(best.score, best.maxScore))}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">{best && best.completedAt ? gradeLabel(best.percent) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatDateTime(s.lastActivity)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {reportAttempt && (
                              <Link
                                href={`/teacher/report/${reportAttempt.id}`}
                                className="rounded-xl bg-ramadan-green px-3 py-1.5 text-xs font-black text-white hover:bg-ramadan-deep"
                              >
                                📄 تقرير PDF
                              </Link>
                            )}
                            <DeleteStudentButton studentId={s.id} name={s.name} onDeleted={onRefresh} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
