"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { teacherFetch } from "./teacher-client";

export default function StartCompetitionButton({ classroom }: { classroom: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await teacherFetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroom }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok || !j.ok || !j.code) throw new Error(j.error || "تعذر إنشاء المسابقة");
      router.push(`/board/${j.code}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "تعذر إنشاء المسابقة");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={busy}
      className="rounded-xl bg-rose-500 px-4 py-2 font-black text-white shadow hover:bg-rose-600 disabled:opacity-60"
    >
      {busy ? "⏳ جارٍ التجهيز..." : "🏆 مسابقة مباشرة"}
    </button>
  );
}
