"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Overview } from "@/lib/teacher-types";
import PrintToolbar from "./PrintToolbar";
import { AuthRequiredScreen, ErrorScreen, LoadingScreen } from "./Screens";
import StudentReportCard from "./StudentReportCard";
import { UnauthorizedError, clearToken, getStoredToken, teacherFetch } from "./teacher-client";

type State =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "error" }
  | { status: "ready"; data: Overview };

/** تقارير جميع الطلاب في ملف واحد — صفحة لكل طالب */
export default function AllReports() {
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

  if (state.status === "loading") return <LoadingScreen text="جارٍ تجهيز تقارير جميع الطلاب..." />;
  if (state.status === "unauthorized") return <AuthRequiredScreen />;
  if (state.status === "error") return <ErrorScreen onRetry={() => setReloadKey((k) => k + 1)} />;

  const data = state.data;
  const withAttempts = data.students.filter((s) => s.best ?? s.latest);
  const withoutAttempts = data.students.filter((s) => !(s.best ?? s.latest));

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          .report-page { break-after: page; page-break-after: always; }
          .report-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      <PrintToolbar
        filename={`تقارير-جميع-الطلاب-${data.classroom || "كل-الشعب"}.pdf`}
        backHref={data.classroom ? `/teacher?classroom=${encodeURIComponent(data.classroom)}` : "/teacher"}
      />

      <div className="no-print mx-auto max-w-4xl px-6 pt-6">
        <div className="rounded-2xl border border-emerald-100 bg-ramadan-mint px-4 py-3 text-sm font-bold text-ramadan-deep">
          📄 {withAttempts.length} تقرير جاهز للطباعة{data.classroom ? ` — ${data.classroom}` : " — جميع الشعب"} (كل طالب في صفحة
          مستقلة). {withoutAttempts.length > 0 && `• ${withoutAttempts.length} طالب لم يبدأ الرحلة بعد.`}
        </div>
      </div>

      <main id="report-root" className="mx-auto max-w-4xl bg-white px-6 py-6">
        {withAttempts.length === 0 && (
          <p className="py-16 text-center text-lg font-black text-slate-400">لا توجد محاولات بعد لطباعة تقاريرها.</p>
        )}
        {withAttempts.map((s) => {
          const attempt = (s.best ?? s.latest)!;
          return (
            <section key={s.id} className="report-page mb-10 border-b-4 border-dashed border-slate-200 pb-10 last:border-0 print:mb-0 print:border-0 print:pb-0">
              <StudentReportCard student={{ name: s.name, classroom: s.classroom }} attempt={attempt} now={now} />
            </section>
          );
        })}
        {withoutAttempts.length > 0 && (
          <section className="report-page mt-6 rounded-2xl border-2 border-[#e6f4f1] p-5 print-break-inside-avoid">
            <h2 className="text-lg font-black text-[#0b4f3f]">طلاب لم يبدؤوا الرحلة بعد</h2>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600 sm:grid-cols-3">
              {withoutAttempts.map((s) => (
                <li key={s.id}>
                  • {s.name} ({s.classroom || "—"})
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
