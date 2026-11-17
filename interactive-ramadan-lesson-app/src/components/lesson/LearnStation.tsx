"use client";

import { useState } from "react";
import type { LearnBlock, LearnStation as LearnStationData } from "@/lib/lesson-data";
import type { ActivityProps } from "./types";

function DayTimeline() {
  return (
    <div className="rounded-3xl bg-gradient-to-l from-indigo-900 via-sky-400 to-orange-300 p-4 text-white shadow-inner sm:p-6">
      <p className="mb-3 text-center text-lg font-extrabold drop-shadow">⏳ وَقْتُ الصَّوْمِ فِي الْيَوْمِ</p>
      <div className="flex items-center justify-between gap-2 text-center">
        <div className="rounded-2xl bg-white/20 px-3 py-2 backdrop-blur">
          <div className="text-3xl">🌄</div>
          <p className="font-extrabold">طُلُوعُ الْفَجْرِ</p>
          <p className="text-xs font-bold opacity-90">يَبْدَأُ الصَّوْمُ</p>
        </div>
        <div className="relative mx-1 h-3 flex-1 rounded-full bg-white/50">
          <span className="absolute -top-5 right-1/2 translate-x-1/2 animate-float text-3xl">☀️</span>
          <span className="absolute -bottom-7 right-1/2 translate-x-1/2 whitespace-nowrap text-xs font-extrabold">
            نَصُومُ طُولَ النَّهَارِ
          </span>
        </div>
        <div className="rounded-2xl bg-white/20 px-3 py-2 backdrop-blur">
          <div className="text-3xl">🌇</div>
          <p className="font-extrabold">غُرُوبُ الشَّمْسِ</p>
          <p className="text-xs font-bold opacity-90">يُفْطِرُ الصَّائِمُ</p>
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}

export function LearnBlockView({ block }: { block: LearnBlock }) {
  switch (block.kind) {
    case "text":
      return <p className="text-xl font-bold leading-loose text-slate-700">{block.text}</p>;
    case "highlight":
      return (
        <div className="rounded-3xl border-2 border-ramadan-gold/60 bg-ramadan-sand p-5">
          {block.title && <p className="mb-2 text-base font-black text-ramadan-gold-dark">✦ {block.title}</p>}
          <p className="text-2xl font-extrabold leading-loose text-ramadan-deep">{block.text}</p>
        </div>
      );
    case "quran":
      return (
        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
          <p className="mb-2 text-sm font-black text-ramadan-green">قَالَ اللَّهُ تَعَالَى:</p>
          <p className="quran-text text-3xl font-bold text-ramadan-deep sm:text-4xl">{block.text}</p>
          <p className="mt-3 text-sm font-bold text-slate-500">[{block.source}]</p>
        </div>
      );
    case "hadith":
      return (
        <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-center">
          <p className="quran-text text-3xl font-bold text-ramadan-deep sm:text-4xl">{block.text}</p>
          <p className="mt-3 text-sm font-bold text-slate-500">{block.source}</p>
        </div>
      );
    case "list":
      return (
        <div>
          {block.title && <p className="mb-2 text-lg font-black text-ramadan-deep">{block.title}</p>}
          <ul className="space-y-2">
            {block.items.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xl font-bold leading-relaxed text-slate-700 shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    case "light":
      return (
        <div className="relative overflow-hidden rounded-3xl border-2 border-ramadan-gold bg-gradient-to-l from-amber-100 via-ramadan-sand to-amber-50 p-5">
          <span className="absolute -left-3 -top-3 animate-twinkle text-5xl">✨</span>
          <p className="mb-1 text-base font-black text-ramadan-gold-dark">💡 إِضَاءَة</p>
          <p className="text-2xl font-extrabold leading-loose text-ramadan-deep">🚪 {block.text}</p>
        </div>
      );
    case "timeline":
      return <DayTimeline />;
    default:
      return null;
  }
}

export default function LearnStation({ station, sound, onComplete }: ActivityProps<LearnStationData>) {
  const [done, setDone] = useState(false);

  function understood() {
    if (done) return;
    setDone(true);
    sound.playCorrect();
    onComplete({ points: station.maxPoints, tries: 1 });
  }

  return (
    <div className="space-y-5">
      {station.blocks.map((block, i) => (
        <LearnBlockView key={i} block={block} />
      ))}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={() => sound.speak(station.tts)}>
          🔊 اسْتَمِعْ
        </button>
        <button type="button" className="btn-primary" onClick={understood} disabled={done}>
          {done ? "✅ أَحْسَنْتَ!" : `فَهِمْتُ! ✅ (+${station.maxPoints} نِقَاط)`}
        </button>
      </div>
    </div>
  );
}
