"use client";

import { useState } from "react";
import type { McqStation as McqStationData } from "@/lib/lesson-data";
import { pointsForTries, randomEncourage, randomPraise, shuffle } from "@/lib/lesson-data";
import { Feedback } from "./Feedback";
import type { ActivityProps, FeedbackState } from "./types";

const LETTERS = ["أ", "ب", "ج", "د", "هـ"];

/** ترتيب عشوائي جديد لخيارات السؤال في كل مرة */
function shuffledOrder(count: number): number[] {
  return shuffle(Array.from({ length: count }, (_, i) => i));
}

export default function McqStation({ station, sound, onComplete }: ActivityProps<McqStationData>) {
  const [qIndex, setQIndex] = useState(0);
  const [order, setOrder] = useState<number[]>(() => shuffledOrder(station.questions[0].options.length));
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

  function choose(optIndex: number) {
    if (solved || done || wrong.includes(optIndex)) return;
    if (optIndex === q.answer) {
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
      setWrong((w) => [...w, optIndex]);
      setFeedback({ kind: "bad", text: randomEncourage() });
      setShakeKey((k) => k + 1);
      sound.playWrong();
    }
  }

  function next() {
    const nextIndex = qIndex + 1;
    setTotalWrong((t) => t + wrong.length);
    setQIndex(nextIndex);
    setOrder(shuffledOrder(station.questions[nextIndex].options.length));
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
          {sound.ttsEnabled && (
            <button type="button" className="btn-ghost mt-3 px-4 py-2 text-sm" onClick={() => sound.speak(station.intro ?? "")}>
              🔊 اسْتَمِعْ
            </button>
          )}
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
        {order.map((optIndex, pos) => {
          const opt = q.options[optIndex];
          const isWrong = wrong.includes(optIndex);
          const isRight = solved && optIndex === q.answer;
          const base =
            "flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-right text-xl font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300";
          const state = isRight
            ? "border-emerald-500 bg-emerald-50 text-emerald-900 scale-[1.02]"
            : isWrong
              ? "border-rose-300 bg-rose-50 text-rose-700 line-through opacity-70 cursor-not-allowed"
              : "border-emerald-100 bg-white text-slate-800 hover:border-ramadan-green hover:bg-ramadan-mint hover:-translate-y-0.5";
          return (
            <button
              key={`${qIndex}-${optIndex}`}
              type="button"
              className={`${base} ${state}`}
              onClick={() => choose(optIndex)}
              disabled={solved || isWrong}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${
                  isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-rose-200 text-rose-700" : "bg-ramadan-mint text-ramadan-deep"
                }`}
              >
                {isRight ? "✓" : isWrong ? "✗" : LETTERS[pos]}
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
