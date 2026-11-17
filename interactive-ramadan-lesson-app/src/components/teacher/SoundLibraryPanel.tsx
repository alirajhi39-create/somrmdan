"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_SOUND_BYTES, SOUND_SLOTS, soundUrl, type SoundInfo, type SoundSlot } from "@/lib/sound-slots";
import { teacherFetch } from "./teacher-client";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export default function SoundLibraryPanel() {
  const [library, setLibrary] = useState<Record<string, SoundInfo>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sounds", { cache: "no-store" });
      const j = (await res.json()) as { sounds?: SoundInfo[] };
      const map: Record<string, SoundInfo> = {};
      for (const s of j.sounds ?? []) map[s.key] = s;
      setLibrary(map);
    } catch {
      /* تجاهل */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(slot: SoundSlot, file: Blob, filename: string) {
    if (file.size > MAX_SOUND_BYTES) {
      setMessage(`⚠️ الملف كبير (${formatSize(file.size)}) — الحد الأقصى 2.5 م.ب`);
      return;
    }
    setBusyKey(slot.key);
    setMessage("");
    try {
      const form = new FormData();
      form.append("key", slot.key);
      form.append("file", file, filename);
      const res = await teacherFetch("/api/sounds", { method: "POST", body: form });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "تعذر الرفع");
      setMessage(`✅ تم حفظ «${slot.label}» وسيُستخدم على أجهزة الطلاب.`);
      await load();
    } catch (error) {
      setMessage(`⚠️ ${error instanceof Error ? error.message : "تعذر الرفع"}`);
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(slot: SoundSlot) {
    if (!window.confirm(`حذف الصوت المخصص لـ «${slot.label}» والعودة إلى الصوت الافتراضي؟`)) return;
    setBusyKey(slot.key);
    try {
      const res = await teacherFetch(`/api/sounds/${encodeURIComponent(slot.key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("تعذر الحذف");
      setMessage(`🗑️ تم حذف «${slot.label}» — سيُستخدم الصوت الافتراضي.`);
      await load();
    } catch (error) {
      setMessage(`⚠️ ${error instanceof Error ? error.message : "تعذر الحذف"}`);
    } finally {
      setBusyKey(null);
    }
  }

  function preview(info: SoundInfo) {
    try {
      previewRef.current?.pause();
      const audio = new Audio(soundUrl(info));
      previewRef.current = audio;
      void audio.play().catch(() => setMessage("⚠️ تعذر تشغيل الصوت في هذا المتصفح"));
    } catch {
      /* تجاهل */
    }
  }

  async function startRecording(slot: SoundSlot) {
    if (recordingKey) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setMessage("⚠️ التسجيل غير مدعوم في هذا المتصفح — استخدم رفع ملف.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = preferred.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecordingKey(null);
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (blob.size > 0) void upload(slot, blob, `تسجيل-${slot.key}.${ext}`);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingKey(slot.key);
      setRecordSeconds(0);
      setMessage(`🎙️ جارٍ التسجيل لـ «${slot.label}» — اضغط «إيقاف وحفظ» عند الانتهاء.`);
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setMessage("⚠️ لم يُسمح بالوصول إلى الميكروفون.");
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* تجاهل */
    }
  }

  const groups: Array<{ id: SoundSlot["group"]; title: string; hint: string }> = [
    { id: "narration", title: "🗣️ القراءات والتلاوات", hint: "تُشغَّل عند ضغط الطالب زر «استمع» بدل القراءة الآلية" },
    { id: "effects", title: "🔔 المؤثرات الصوتية", hint: "تُشغَّل بدل النغمات الافتراضية" },
  ];

  return (
    <details className="card overflow-hidden">
      <summary className="cursor-pointer select-none px-5 py-4 text-xl font-black text-ramadan-deep hover:bg-ramadan-mint/40">
        🎵 مكتبة الأصوات — إضافة وحذف
        <span className="mr-2 text-sm font-bold text-slate-500">
          ({Object.keys(library).length} من {SOUND_SLOTS.length} خانات مخصصة)
        </span>
      </summary>
      <div className="space-y-5 border-t border-emerald-100 p-5">
        <p className="rounded-2xl bg-ramadan-sand px-4 py-2 text-sm font-bold text-ramadan-deep">
          ارفع ملفًا صوتيًا (mp3 / wav / ogg / m4a حتى 2.5 م.ب) أو سجّل بصوتك مباشرة من الميكروفون. الحذف يعيد الصوت الافتراضي.
        </p>
        {message && <p className="text-sm font-bold text-ramadan-deep">{message}</p>}

        {groups.map((g) => (
          <div key={g.id}>
            <h3 className="text-lg font-black text-ramadan-deep">{g.title}</h3>
            <p className="mb-2 text-xs font-bold text-slate-500">{g.hint}</p>
            <div className="grid gap-2 lg:grid-cols-2">
              {SOUND_SLOTS.filter((s) => s.group === g.id).map((slot) => {
                const info = library[slot.key];
                const busy = busyKey === slot.key;
                const recording = recordingKey === slot.key;
                return (
                  <div key={slot.key} className={`rounded-2xl border p-3 ${info ? "border-emerald-300 bg-emerald-50/50" : "border-emerald-100 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-800">{slot.label}</p>
                        <p className="text-xs font-bold text-slate-500">{slot.hint}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${info ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
                        {info ? "مخصص ✅" : "افتراضي"}
                      </span>
                    </div>
                    {info && (
                      <p className="mt-1 truncate text-xs font-bold text-emerald-800" title={info.filename}>
                        📁 {info.filename} • {formatSize(info.size)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {info && (
                        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => preview(info)}>
                          ▶️ تشغيل
                        </button>
                      )}
                      <label className={`btn-ghost cursor-pointer px-3 py-1.5 text-xs ${busy || recordingKey ? "pointer-events-none opacity-50" : ""}`}>
                        📤 {info ? "استبدال بملف" : "رفع ملف"}
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void upload(slot, f, f.name);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {recording ? (
                        <button type="button" className="animate-pulse rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-black text-white" onClick={stopRecording}>
                          ⏹ إيقاف وحفظ ({recordSeconds} ث)
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost px-3 py-1.5 text-xs"
                          disabled={busy || Boolean(recordingKey)}
                          onClick={() => void startRecording(slot)}
                        >
                          🎙️ تسجيل
                        </button>
                      )}
                      {info && (
                        <button
                          type="button"
                          className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void remove(slot)}
                        >
                          🗑️ حذف
                        </button>
                      )}
                      {busy && <span className="text-xs font-bold text-slate-500">⏳ جارٍ الحفظ...</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
