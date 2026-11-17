"use client";

import { useState } from "react";
import type { McqStation as McqStationData } from "@/lib/lesson-data";
import { pointsForTries, randomEncourage, randomPraise } from "@/lib/lesson-data";
import { Feedback } from "./Feedback";
import type { ActivityProps, FeedbackState } from "./types";

const LETTERS = ["أ", "ب", "ج", "د", "هـ"];

export default function McqStation({ station, sound, onComplete }: ActivityProps<McqStationData>) {
  const [qIndex, setQIndex] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [points, setPoints] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [done, setDone] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const q = station.questions[qIndex];
  const perQuestion = station.maxPoints / station.questions.length;
  const isLast = qIndex === station.questions.length - 1;

  function choose(i: number) {
    if (solved || done || wrong.includes(i)) return;
    if (i === q.answer) {
      const earned = pointsForTries(perQuestion, wrong.length + 1);
      const newPoints = points + earned;
      setPoints(newPoints);
      setSolved(true);
      setFeedback({ kind: "ok", text: `${randomPraise()} ${q.explain}` });
      sound.playCorrect();
      if (isLast) {
        setDone(true);
        onComplete({ points: newPoints, tries: totalWrong + wrong.length + 1 });
      }
    } else {
      setWrong((w) => [...w, i]);
      setFeedback({ kind: "bad", text: randomEncourage() });
      setShakeKey((k) => k + 1);
      sound.playWrong();
    }
  }

  function next() {
    setTotalWrong((t) => t + wrong.length);
    setQIndex((i) => i + 1);
    setWrong([]);
    setSolved(false);
    setFeedback(null);
    sound.playClick();
  }

  return (
    <div className="space-y-5">
      {station.intro && qIndex === 0 && (
        <div className="rounded-3xl border-2 border-ramadan-gold/50 bg-ramadan-sand p-5">
          <p className="text-xl font-bold leading-loose text-ramadan-deep">{station.intro}</p>
          <button type="button" className="btn-ghost mt-3 px-4 py-2 text-sm" onClick={() => sound.speak(station.intro ?? "")}>
            🔊 اسْتَمِعْ
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="chip">
          ❓ السُّؤَالُ {qIndex + 1} مِنْ {station.questions.length}
        </span>
        <span className="chip">🏅 {perQuestion} نِقَاط</span>
      </div>

      <h3 className="text-2xl font-black leading-relaxed text-ramadan-deep sm:text-3xl">{q.prompt}</h3>

      <div key={shakeKey} className={`grid gap-3 sm:grid-cols-2 ${feedback?.kind === "bad" ? "animate-shake" : ""}`}>
        {q.options.map((opt, i) => {
          const isWrong = wrong.includes(i);
          const isRight = solved && i === q.answer;
          const base =
            "flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-right text-xl font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300";
          const state = isRight
            ? "border-emerald-500 bg-emerald-50 text-emerald-900 scale-[1.02]"
            : isWrong
              ? "border-rose-300 bg-rose-50 text-rose-700 line-through opacity-70 cursor-not-allowed"
              : "border-emerald-100 bg-white text-slate-800 hover:border-ramadan-green hover:bg-ramadan-mint hover:-translate-y-0.5";
          return (
            <button
              key={opt}
              type="button"
              className={`${base} ${state}`}
              onClick={() => choose(i)}
              disabled={solved || isWrong}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${
                  isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-rose-200 text-rose-700" : "bg-ramadan-mint text-ramadan-deep"
                }`}
              >
                {isRight ? "✓" : isWrong ? "✗" : LETTERS[i]}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      <Feedback feedback={feedback} />

      {solved && !isLast && (
        <div className="flex justify-center">
          <button type="button" className="btn-primary" onClick={next}>
            السُّؤَالُ التَّالِي ⬅
          </button>
        </div>
      )}
    </div>
  );
}
