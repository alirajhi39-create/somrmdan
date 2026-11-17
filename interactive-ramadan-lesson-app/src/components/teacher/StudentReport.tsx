"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttemptDetail } from "@/lib/teacher-types";
import PrintToolbar from "./PrintToolbar";
import { AuthRequiredScreen, ErrorScreen, LoadingScreen } from "./Screens";
import StudentReportCard from "./StudentReportCard";
import { UnauthorizedError, clearToken, getStoredToken, teacherFetch } from "./teacher-client";

type State =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "notfound" }
  | { status: "error" }
  | { status: "ready"; data: AttemptDetail };

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

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <PrintToolbar filename={`تقرير-${student.name}-صوم-رمضان.pdf`} />
      <main id="report-root" className="mx-auto max-w-4xl bg-white px-6 py-8">
        <StudentReportCard student={student} attempt={attempt} now={now} />
      </main>
    </div>
  );
}
