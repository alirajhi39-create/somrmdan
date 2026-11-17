"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Overview } from "@/lib/teacher-types";
import Dashboard from "./Dashboard";
import LoginForm from "./LoginForm";
import { ErrorScreen, LoadingScreen } from "./Screens";
import { UnauthorizedError, clearToken, getStoredToken, storeToken, teacherFetch } from "./teacher-client";

type Status = "init" | "login" | "loading" | "ready" | "error";

export default function TeacherArea() {
  const searchParams = useSearchParams();
  const classroom = searchParams.get("classroom") ?? "";
  const [status, setStatus] = useState<Status>("init");
  const [data, setData] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    if (!getStoredToken()) {
      setStatus("login");
      return;
    }
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const res = await teacherFetch(`/api/teacher/overview?classroom=${encodeURIComponent(classroom)}`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { ok: boolean; data: Overview };
      setData(json.data);
      setStatus("ready");
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        clearToken();
        setData(null);
        setStatus("login");
        return;
      }
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
  if (status === "error" || !data) return <ErrorScreen onRetry={() => void load()} />;

  return <Dashboard data={data} refreshing={status === "loading"} onLogout={() => void logout()} onRefresh={() => void load()} />;
}
