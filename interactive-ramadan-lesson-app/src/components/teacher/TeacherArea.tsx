"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Overview } from "@/lib/teacher-types";
import Dashboard from "./Dashboard";
import DbStatusBadge from "./DbStatusBadge";
import LoginForm from "./LoginForm";
import { ErrorScreen, LoadingScreen } from "./Screens";
import { UnauthorizedError, clearToken, getStoredToken, storeToken, teacherFetch } from "./teacher-client";

type Status = "init" | "login" | "loading" | "ready" | "error";

export default function TeacherArea() {
  const searchParams = useSearchParams();
  const classroom = searchParams.get("classroom") ?? "";
  const [status, setStatus] = useState<Status>("init");
  const [data, setData] = useState<Overview | null>(null);
  const [errorDetails, setErrorDetails] = useState("");

  const load = useCallback(async () => {
    if (!getStoredToken()) {
      setStatus("login");
      return;
    }
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const res = await teacherFetch(`/api/teacher/overview?classroom=${encodeURIComponent(classroom)}`);
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: Overview; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || `فشل الطلب (${res.status})`);
      }
      setData(json.data);
      setErrorDetails("");
      setStatus("ready");
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        clearToken();
        setData(null);
        setStatus("login");
        return;
      }
      setErrorDetails(error instanceof Error ? error.message : "خطأ غير معروف");
      setStatus("error");
    }
  }, [classroom]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    try {
      await fetch("/api/teacher/logout", { method: "POST" });
    } catch {
      /* تجاهل */
    }
    clearToken();
    setData(null);
    setStatus("login");
  }

  if (status === "login") {
    return (
      <LoginForm
        onSuccess={(token) => {
          storeToken(token);
          void load();
        }}
      />
    );
  }
  if (status === "init" || (status === "loading" && !data)) return <LoadingScreen />;
  if (status === "error" || !data) {
    return (
      <ErrorScreen
        message="تم تسجيل الدخول، لكن تعذر تحميل بيانات الطلاب"
        details={errorDetails}
        onRetry={() => void load()}
        onLogout={() => void logout()}
      >
        <DbStatusBadge />
      </ErrorScreen>
    );
  }

  return <Dashboard data={data} refreshing={status === "loading"} onLogout={() => void logout()} onRefresh={() => void load()} />;
}
