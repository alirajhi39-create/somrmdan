"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SECTIONS } from "@/lib/lesson-data";
import { teacherFetch } from "./teacher-client";

interface Props {
  studentId: number;
  name: string;
  classroom: string;
  onSaved: () => void;
}

export default function EditStudentButton({ studentId, name, classroom, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name, classroom: classroom || SECTIONS[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ name, classroom: classroom || SECTIONS[0] });
      setError("");
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, name, classroom]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const clean = form.name.trim().replace(/\s+/g, " ");
    if (clean.length < 2) {
      setError("اكتب اسمًا صحيحًا (حرفان على الأقل)");
      return;
    }
    if (clean === name && form.classroom === classroom) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await teacherFetch(`/api/teacher/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, classroom: form.classroom }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "تعذر حفظ التعديل");
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التعديل");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-black text-ramadan-deep transition hover:bg-ramadan-mint"
        title="تعديل اسم الطالب أو شعبته"
      >
        ✏️ تعديل
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void save(e)} className="animate-pop w-64 space-y-2 rounded-2xl border-2 border-ramadan-green bg-white p-3 shadow-lg">
      <label className="block text-xs font-black text-ramadan-deep">
        الاسم
        <input
          ref={inputRef}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          maxLength={60}
          className="mt-1 w-full rounded-xl border-2 border-emerald-200 px-3 py-1.5 text-base font-bold outline-none focus:border-ramadan-green"
        />
      </label>
      <div>
        <p className="text-xs font-black text-ramadan-deep">الشعبة</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm({ ...form, classroom: s })}
              className={`rounded-lg border-2 px-2 py-1 text-xs font-black ${
                form.classroom === s ? "border-ramadan-green bg-ramadan-green text-white" : "border-emerald-200 text-ramadan-deep"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-ramadan-green px-3 py-1.5 text-sm font-black text-white hover:bg-ramadan-deep disabled:opacity-60">
          {busy ? "⏳..." : "💾 حفظ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-600 hover:bg-slate-50">
          إلغاء
        </button>
      </div>
    </form>
  );
}
