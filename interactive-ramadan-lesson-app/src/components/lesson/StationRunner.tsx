"use client";

import { useRef, useState } from "react";
import type { Station } from "@/lib/lesson-data";
import FillStation from "./FillStation";
import LearnStation from "./LearnStation";
import McqStation from "./McqStation";
import OrderStation from "./OrderStation";
import TrueFalseStation from "./TrueFalseStation";
import type { SoundApi, StationOutcome } from "./types";

interface Props {
  station: Station;
  index: number;
  total: number;
  sound: SoundApi;
  onComplete: (outcome: StationOutcome & { timeSec: number }) => void;
  onNext: () => void;
}

export default function StationRunner({ station, index, total, sound, onComplete, onNext }: Props) {
  const [outcome, setOutcome] = useState<StationOutcome | null>(null);
  const startRef = useRef<number>(Date.now());
  const completedRef = useRef(false);

  function handleComplete(o: StationOutcome) {
    if (completedRef.current) return;
    completedRef.current = true;
    const timeSec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    setOutcome(o);
    onComplete({ ...o, timeSec });
  }

  const isLast = index === total - 1;

  let body: React.ReactNode;
  switch (station.type) {
    case "learn":
      body = <LearnStation station={station} sound={sound} onComplete={handleComplete} />;
      break;
    case "mcq":
      body = <McqStation station={station} sound={sound} onComplete={handleComplete} />;
      break;
    case "order":
      body = <OrderStation station={station} sound={sound} onComplete={handleComplete} />;
      break;
    case "fill":
      body = <FillStation station={station} sound={sound} onComplete={handleComplete} />;
      break;
    case "truefalse":
      body = <TrueFalseStation station={station} sound={sound} onComplete={handleComplete} />;
      break;
  }

  return (
    <section className="card animate-pop overflow-hidden" aria-live="polite">
      <div className="flex items-center gap-4 border-b border-emerald-100 bg-gradient-to-l from-ramadan-mint to-white px-5 py-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-4xl shadow">{station.icon}</div>
        <div className="flex-1">
          <p className="text-sm font-black text-ramadan-green">
            المَحَطَّةُ {index + 1} مِنْ {total}
          </p>
          <h2 className="text-2xl font-black text-ramadan-deep sm:text-3xl">{station.title}</h2>
          <p className="text-sm font-bold text-slate-500">{station.subtitle}</p>
        </div>
        <span className="chip hidden sm:inline-flex">🏅 {station.maxPoints} نِقَاط</span>
      </div>

      <div className="p-5 sm:p-7">{body}</div>

      {outcome && (
        <div className="flex flex-col items-center gap-3 border-t border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:flex-row sm:justify-between">
          <p className="text-lg font-black text-emerald-900">
            ✨ حَصَلْتَ عَلَى {outcome.points} مِنْ {station.maxPoints} نِقَاط
            {outcome.tries === 1 && (
              <span className="mr-2 rounded-full bg-ramadan-gold px-2 py-0.5 text-sm text-white">مِنْ أَوَّلِ مُحَاوَلَةٍ 🥇</span>
            )}
          </p>
          <button type="button" className="btn-gold" onClick={onNext}>
            {isLast ? "🏁 إِنْهَاءُ الرِّحْلَةِ وَالْحُصُولُ عَلَى الشَّهَادَةِ" : "المَحَطَّةُ التَّالِيَةُ ⬅"}
          </button>
        </div>
      )}
    </section>
  );
}
