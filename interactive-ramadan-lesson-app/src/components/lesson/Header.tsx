"use client";

import Link from "next/link";
import { SCHOOL_NAME, SUBJECT } from "@/lib/lesson-data";
import type { SoundApi } from "./types";

export default function Header({ sound }: { sound: SoundApi }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-ramadan-green to-ramadan-deep text-2xl shadow-lg shadow-emerald-900/20">
            🌙
          </div>
          <div className="leading-tight">
            <p className="text-base font-black text-ramadan-deep sm:text-lg">🕌 {SCHOOL_NAME}</p>
            <p className="text-xs font-bold text-slate-500 sm:text-sm">{SUBJECT}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sound.toggleMute}
            className="btn-ghost px-3 py-2 text-xl"
            aria-label={sound.muted ? "تشغيل الصوت" : "كتم الصوت"}
            title={sound.muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {sound.muted ? "🔇" : "🔊"}
          </button>
          <Link href="/teacher" className="btn-gold px-4 py-2 text-sm sm:text-base">
            👨‍🏫 دخول المعلم
          </Link>
        </div>
      </div>
    </header>
  );
}
