"use client";

import { STATIONS } from "@/lib/lesson-data";

interface Props {
  current: number;
  total: number;
  doneIndexes: number[];
  score: number;
  maxScore: number;
  studentName: string;
}

export default function ProgressBar({ current, total, doneIndexes, score, maxScore, studentName }: Props) {
  const percent = Math.round((doneIndexes.length / total) * 100);
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-black text-ramadan-deep">
        <span>👋 أَهْلًا {studentName}</span>
        <span>
          📍 المَحَطَّةُ {current + 1} مِنْ {total}
        </span>
        <span>
          ⭐ النِّقَاطُ: {score} / {maxScore}
        </span>
        <span>{percent}% مُكْتَمِل</span>
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-gradient-to-l from-ramadan-green via-emerald-400 to-ramadan-gold transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {STATIONS.map((s, i) => {
          const done = doneIndexes.includes(i);
          const active = i === current;
          return (
            <span
              key={s.key}
              title={`${i + 1}. ${s.title}`}
              className={`grid h-9 w-9 place-items-center rounded-full text-base font-black transition ${
                done
                  ? "bg-ramadan-gold text-white"
                  : active
                    ? "animate-pulse-soft bg-ramadan-green text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓" : s.icon}
            </span>
          );
        })}
      </div>
    </div>
  );
}
