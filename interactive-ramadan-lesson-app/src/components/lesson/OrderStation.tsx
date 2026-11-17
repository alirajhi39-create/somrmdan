"use client";

import { useState } from "react";
import type { OrderStation as OrderStationData } from "@/lib/lesson-data";
import { pointsForTries, randomEncourage, randomPraise, shuffle } from "@/lib/lesson-data";
import { Feedback } from "./Feedback";
import type { ActivityProps, FeedbackState } from "./types";

function shuffledIndices(n: number): number[] {
  const base = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return base;
  let result = shuffle(base);
  let guard = 0;
  while (result.every((v, i) => v === i) && guard < 10) {
    result = shuffle(base);
    guard++;
  }
  return result;
}

export default function OrderStation({ station, sound, onComplete }: ActivityProps<OrderStationData>) {
  const n = station.chunks.length;
  const [pool, setPool] = useState<number[]>(() => shuffledIndices(n));
  const [slots, setSlots] = useState<(number | null)[]>(() => Array<number | null>(n).fill(null));
  const [locked, setLocked] = useState<boolean[]>(() => Array<boolean>(n).fill(false));
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const fontClass = station.font === "amiri" ? "quran-text text-2xl sm:text-3xl" : "text-xl sm:text-2xl";
  const allFilled = slots.every((s) => s !== null);

  function pick(idx: number) {
    if (done) return;
    const firstEmpty = slots.indexOf(null);
    if (firstEmpty === -1) return;
    const next = [...slots];
    next[firstEmpty] = idx;
    setSlots(next);
    setPool((p) => p.filter((i) => i !== idx));
    setFeedback(null);
    sound.playClick();
  }

  function unpick(slot: number) {
    if (done || locked[slot]) return;
    const idx = slots[slot];
    if (idx === null) return;
    const next = [...slots];
    next[slot] = null;
    setSlots(next);
    setPool((p) => [...p, idx]);
    sound.playClick();
  }

  function check() {
    if (done || !allFilled) return;
    const t = tries + 1;
    setTries(t);
    const allCorrect = slots.every((v, i) => v === i);
    if (allCorrect) {
      setLocked(Array<boolean>(n).fill(true));
      setDone(true);
      setFeedback({ kind: "ok", text: `${randomPraise()} ${station.success}` });
      sound.playCorrect();
      onComplete({ points: pointsForTries(station.maxPoints, t), tries: t });
    } else {
      const returned = slots.filter((v, i): v is number => v !== null && v !== i);
      setSlots(slots.map((v, i) => (v === i ? v : null)));
      setLocked(slots.map((v, i) => v === i));
      setPool((p) => shuffle([...p, ...returned]));
      setFeedback({
        kind: "bad",
        text: `${randomEncourage()} الْبِطَاقَاتُ الْخَضْرَاءُ فِي مَكَانِهَا الصَّحِيحِ، أَعِدْ تَرْتِيبَ الْبَاقِي.`,
      });
      setShakeKey((k) => k + 1);
      sound.playWrong();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xl font-black text-ramadan-deep sm:text-2xl">{station.prompt}</p>

      {/* الخانات */}
      <div
        key={shakeKey}
        className={`rounded-3xl border-2 border-dashed border-ramadan-gold/70 bg-ramadan-sand p-4 ${
          feedback?.kind === "bad" ? "animate-shake" : ""
        }`}
      >
        <div className="flex flex-wrap items-stretch justify-center gap-3">
          {slots.map((value, slotIndex) => {
            const isLocked = locked[slotIndex];
            return (
              <button
                key={slotIndex}
                type="button"
                onClick={() => unpick(slotIndex)}
                disabled={value === null || isLocked}
                className={`relative min-h-16 min-w-36 flex-1 rounded-2xl border-2 px-4 py-3 font-extrabold transition ${fontClass} ${
                  value === null
                    ? "border-dashed border-slate-300 bg-white/60 text-slate-300"
                    : isLocked
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-ramadan-green bg-white text-ramadan-deep hover:bg-rose-50 hover:border-rose-300"
                }`}
                title={value !== null && !isLocked ? "اضغط لإرجاع البطاقة" : undefined}
              >
                <span className="absolute -top-3 right-3 rounded-full bg-ramadan-gold px-2 text-xs font-black text-white">
                  {slotIndex + 1}
                </span>
                {value === null ? "……" : station.chunks[value]}
              </button>
            );
          })}
        </div>
        {station.source && done && <p className="mt-3 text-center text-sm font-bold text-slate-500">[{station.source}]</p>}
      </div>

      {/* البطاقات المتاحة */}
      {!done && (
        <div className="flex flex-wrap justify-center gap-3">
          {pool.map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => pick(idx)}
              className={`rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 font-extrabold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-ramadan-green hover:bg-ramadan-mint ${fontClass}`}
            >
              {station.chunks[idx]}
            </button>
          ))}
        </div>
      )}

      <Feedback feedback={feedback} />

      {!done && (
        <div className="flex justify-center">
          <button type="button" className="btn-primary" onClick={check} disabled={!allFilled}>
            ✔ تَحَقَّقْ مِنَ التَّرْتِيبِ
          </button>
        </div>
      )}
    </div>
  );
}
