"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from "@/lib/settings-types";
import { teacherFetch } from "./teacher-client";

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { settings?: unknown }) => {
        if (j?.settings) setSettings(sanitizeSettings(j.settings));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function update(patch: Partial<AppSettings["sound"]>) {
    setSettings((s) => ({ ...s, sound: { ...s.sound, ...patch } }));
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await teacherFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; settings?: unknown; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "فشل الحفظ");
      if (j.settings) setSettings(sanitizeSettings(j.settings));
      setMessage("✅ تم حفظ الإعدادات وستُطبَّق على أجهزة الطلاب عند فتح الدرس.");
    } catch (error) {
      setMessage(`⚠️ ${error instanceof Error ? error.message : "تعذر الحفظ"}`);
    } finally {
      setSaving(false);
    }
  }

  function testSound() {
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0005, 0.16 * settings.sound.volume), start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      if (settings.sound.tts && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance("صوم رمضان");
        u.lang = "ar-SA";
        u.rate = settings.sound.rate;
        u.volume = settings.sound.volume;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {
      /* تجاهل */
    }
  }

  const Toggle = ({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3">
      <span>
        <span className="block font-black text-ramadan-deep">{label}</span>
        <span className="block text-xs font-bold text-slate-500">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${value ? "bg-ramadan-green" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${value ? "right-1" : "right-7"}`}
        />
      </button>
    </label>
  );

  return (
    <details className="card overflow-hidden">
      <summary className="cursor-pointer select-none px-5 py-4 text-xl font-black text-ramadan-deep hover:bg-ramadan-mint/40">
        ⚙️ إعدادات الصوت والمسابقة
        <span className="mr-2 text-sm font-bold text-slate-500">(تُطبَّق على جميع أجهزة الطلاب)</span>
      </summary>
      <div className="space-y-4 border-t border-emerald-100 p-5">
        {!loaded && <p className="text-sm font-bold text-slate-400">⏳ جارٍ تحميل الإعدادات...</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            label="🔔 المؤثرات الصوتية"
            hint="أصوات الإجابة الصحيحة/الخاطئة وإتمام المحطات"
            value={settings.sound.effects}
            onChange={(v) => update({ effects: v })}
          />
          <Toggle
            label="🗣️ القراءة الصوتية (زر استمع)"
            hint="قراءة الآية والحديث والنصوص بصوت الجهاز"
            value={settings.sound.tts}
            onChange={(v) => update({ tts: v })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
            <span className="flex items-center justify-between font-black text-ramadan-deep">
              <span>🔊 مستوى الصوت</span>
              <span className="text-sm text-slate-500">{Math.round(settings.sound.volume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sound.volume * 100)}
              onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
              className="mt-2 w-full accent-emerald-600"
            />
          </label>
          <label className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
            <span className="flex items-center justify-between font-black text-ramadan-deep">
              <span>🐢 سرعة القراءة 🐇</span>
              <span className="text-sm text-slate-500">{settings.sound.rate.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={60}
              max={130}
              value={Math.round(settings.sound.rate * 100)}
              onChange={(e) => update({ rate: Number(e.target.value) / 100 })}
              className="mt-2 w-full accent-emerald-600"
            />
          </label>
          <label className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
            <span className="flex items-center justify-between font-black text-ramadan-deep">
              <span>⏱️ زمن سؤال المسابقة</span>
              <span className="text-sm text-slate-500">{settings.competition.seconds} ث</span>
            </span>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={settings.competition.seconds}
              onChange={(e) => {
                const seconds = Number(e.target.value);
                setSettings((s) => ({ ...s, competition: { seconds } }));
                setMessage("");
              }}
              className="mt-2 w-full accent-emerald-600"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary px-5 py-2 text-base" onClick={() => void save()} disabled={saving}>
            {saving ? "⏳ جارٍ الحفظ..." : "💾 حفظ الإعدادات"}
          </button>
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={testSound}>
            ▶️ تجربة الصوت
          </button>
          {message && <span className="text-sm font-bold text-ramadan-deep">{message}</span>}
        </div>
      </div>
    </details>
  );
}
