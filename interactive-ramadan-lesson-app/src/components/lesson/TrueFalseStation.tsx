"use client";

import { useState } from "react";
import type { TrueFalseStation as TrueFalseStationData } from "@/lib/lesson-data";
import { pointsForTries, randomEncourage, randomPraise, shuffle } from "@/lib/lesson-data";
import { Feedback } from "./Feedback";
import type { ActivityProps, FeedbackState } from "./types";

export default function TrueFalseStation({ station, sound, onComplete }: ActivityProps<TrueFalseStationData>) {
  const count = station.statements.length;
  const perStatement = station.maxPoints / count;

  // ترتيب عشوائي للعبارات في كل مرة
  const [order] = useState<number[]>(() => shuffle(station.statements.map((_, i) => i)));
  const [answers, setAnswers] = useState<Record<number, boolean | undefined>>({});
  const [locked, setLocked] = useState<Record<number, boolean>>({});
  const [triesPer, setTriesPer] = useState<Record<number, number>>({});
  const [wrongNow, setWrongNow] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [done, setDone] = useState(false);
  const [rounds, setRounds] = useState(0);

  const allAnswered = station.statements.every((_, i) => locked[i] || answers[i] !== undefined);

  function choose(i: number, value: boolean) {
    if (done || locked[i]) return;
    setAnswers((a) => ({ ...a, [i]: value }));
    setWrongNow((w) => w.filter((x) => x !== i));
    sound.playClick();
  }

  function check() {
    if (done || !allAnswered) return;
    const nextLocked = { ...locked };
    const nextTries = { ...triesPer };
    const nextAnswers = { ...answers };
    const wrong: number[] = [];

    station.statements.forEach((s, i) => {
      if (nextLocked[i]) return;
      nextTries[i] = (nextTries[i] ?? 0) + 1;
      if (answers[i] === s.answer) {
        nextLocked[i] = true;
      } else {
        wrong.push(i);
        delete nextAnswers[i];
      }
    });

    setLocked(nextLocked);
    setTriesPer(nextTries);
    setAnswers(nextAnswers);
    setWrongNow(wrong);
    setRounds((r) => r + 1);

    if (wrong.length === 0) {
      const points = station.statements.reduce((sum, _, i) => sum + pointsForTries(perStatement, nextTries[i] ?? 1), 0);
      setDone(true);
      setFeedback({ kind: "ok", text: `${randomPraise()} أَجَبْتَ عَنْ جَمِيعِ الْعِبَارَاتِ بِشَكْلٍ صَحِيحٍ.` });
      sound.playCorrect();
      onComplete({ points: Math.round(points), tries: rounds + 1 });
    } else {
      setFeedback({
        kind: "bad",
        text: `${randomEncourage()} ${wrong.length === 1 ? "عِبَارَةٌ وَاحِدَةٌ" : `${wrong.length} عِبَارَاتٍ`} تَحْتَاجُ إِلَى مُرَاجَعَةٍ.`,
      });
      sound.playWrong();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xl font-black text-ramadan-deep sm:text-2xl">{station.prompt}</p>

      <ul className="space-y-3">
        {order.map((i, pos) => {
          const s = station.statements[i];
          const isLocked = Boolean(locked[i]);
          const isWrong = wrongNow.includes(i);
          const current = answers[i];
          return (
            <li
              key={i}
              className={`rounded-2xl border-2 p-4 transition ${
                isLocked
                  ? "border-emerald-400 bg-emerald-50"
                  : isWrong
                    ? "animate-shake border-rose-300 bg-rose-50"
                    : "border-emerald-100 bg-white"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xl font-extrabold leading-relaxed text-slate-800">
                  <span className="ml-2 inline-grid h-8 w-8 place-items-center rounded-full bg-ramadan-mint text-sm text-ramadan-deep">
                    {pos + 1}
                  </span>
                  {s.text}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => choose(i, true)}
                    className={`rounded-xl border-2 px-4 py-2 text-lg font-black transition ${
                      current === true
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    } disabled:opacity-80`}
                  >
                    ✅ صَحّ
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => choose(i, false)}
                    className={`rounded-xl border-2 px-4 py-2 text-lg font-black transition ${
                      current === false
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                    } disabled:opacity-80`}
                  >
                    ❌ خَطَأ
                  </button>
                </div>
              </div>
              {isLocked && <p className="mt-2 text-sm font-bold text-emerald-800">💡 {s.explain}</p>}
            </li>
          );
        })}
      </ul>

      <Feedback feedback={feedback} />

      {!done && (
        <div className="flex justify-center">
          <button type="button" className="btn-primary" onClick={check} disabled={!allAnswered}>
            ✔ تَحَقَّقْ مِنَ الإِجَابَاتِ
          </button>
        </div>
      )}
    </div>
  );
}
