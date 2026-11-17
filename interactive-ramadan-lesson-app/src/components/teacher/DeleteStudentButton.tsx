"use client";

import { useState } from "react";
import { teacherFetch } from "./teacher-client";

export default function DeleteStudentButton({
  studentId,
  name,
  onDeleted,
}: {
  studentId: number;
  name: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`هل تريد حذف الطالب «${name}» وجميع محاولاته؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setBusy(true);
    try {
      const res = await teacherFetch(`/api/teacher/students/${studentId}`, { method: "DELETE" });
      if (!res.ok) window.alert("تعذر الحذف، حاول مرة أخرى.");
      onDeleted();
    } catch {
      window.alert("تعذر الحذف، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={busy}
      className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
      title="حذف الطالب"
    >
      🗑️ حذف
    </button>
  );
}
