"use client";

import { useMemo, useState, type DragEvent } from "react";
import type { FillStation as FillStationData } from "@/lib/lesson-data";
import { pointsForTries, randomEncourage, randomPraise, shuffle } from "@/lib/lesson-data";
import { Feedback } from "./Feedback";
import type { ActivityProps, FeedbackState } from "./types";

/**
 * إكمال الفراغات:
 * - الضغط على كلمة يُنزلها تلقائيًا في أول فراغ شاغر (المُضيء)
 * - الضغط على فراغ ممتلئ يُرجع كلمته إلى البنك
 * - السحب والإفلات متاح أيضًا على الحاسوب
 */
export default function FillStation({ station, sound, onComplete }: ActivityProps<FillStationData>) {
  const blanks = useMemo(() => {
    const list: { id: string; answer: string }[] = [];
    station.lines.forEach((line, li) =>
      line.forEach((tok, ti) => {
        if (typeof tok !== "string") list.push({ id: `${li}-${ti}`, answer: tok.blank });
      }),
    );
    return list;
  }, [station]);

  const [bank] = useState<string[]>(() => shuffle(station.bank));
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const usedWords = Object.values(placed);
  const available = bank.filter((w) => !usedWords.includes(w));
  const allFilled = blanks.every((b) => Boolean(placed[b.id]));
  const nextBlankId = blanks.find((b) => !locked[b.id] && !placed[b.id])?.id ?? null;
  const fontClass = station.font === "amiri" ? "quran-text text-2xl sm:text-3xl" : "text-xl sm:text-2xl";

  function place(id: string, word: string) {
    if (done || locked[id] || !word) return;
    setPlaced((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === word && !locked[key]) delete next[key];
      }
      next[id] = word;
      return next;
    });
    setWrongIds([]);
    setFeedback(null);
    sound.playClick();
  }

  /** الضغط على كلمة: تنزل في أول فراغ شاغر */
  function placeNext(word: string) {
    if (done) return;
    if (!nextBlankId) {
      setFeedback({
        kind: "info",
        text: "💡 الْفَرَاغَاتُ مُمْتَلِئَةٌ — اضْغَطْ عَلَى فَرَاغٍ لِإِرْجَاعِ كَلِمَتِهِ ثُمَّ اخْتَرِ الْكَلِمَةَ الصَّحِيحَةَ.",
      });
      return;
    }
    place(nextBlankId, word);
  }

  function removeFrom(id: string) {
    if (done || locked[id]) return;
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    sound.playClick();
  }

  function onBlankClick(id: string) {
    if (done || locked[id]) return;
    if (placed[id]) {
      removeFrom(id);
    } else {
      setFeedback({ kind: "info", text: "💡 اضْغَطْ عَلَى الْكَلِمَةِ الْمُنَاسِبَةِ فِي الأَعْلَى لِتَنْزِلَ فِي هَذَا الْفَرَاغِ." });
    }
  }

  function onDrop(e: DragEvent<HTMLButtonElement>, id: string) {
    e.preventDefault();
    const word = e.dataTransfer.getData("text/plain");
    if (word) place(id, word);
  }

  function check() {
    if (done || !allFilled) return;
    const t = tries + 1;
    setTries(t);
    const wrong = blanks.filter((b) => placed[b.id] !== b.answer).map((b) => b.id);
    if (wrong.length === 0) {
      const all: Record<string, boolean> = {};
      blanks.forEach((b) => (all[b.id] = true));
      setLocked(all);
      setDone(true);
      setFeedback({ kind: "ok", text: `${randomPraise()} ${station.success}` });
      sound.playCorrect();
      onComplete({ points: pointsForTries(station.maxPoints, t), tries: t });
    } else {
      const nextLocked = { ...locked };
      blanks.forEach((b) => {
        if (placed[b.id] === b.answer) nextLocked[b.id] = true;
      });
      setLocked(nextLocked);
      setPlaced((prev) => {
        const next = { ...prev };
        wrong.forEach((id) => delete next[id]);
        return next;
      });
      setWrongIds(wrong);
      setFeedback({
        kind: "bad",
        text: `${randomEncourage()} ${wrong.length === 1 ? "كَلِمَةٌ وَاحِدَةٌ" : `${wrong.length} كَلِمَاتٍ`} فِي غَيْرِ مَكَانِهَا، أُعِيدَتْ إِلَى الأَعْلَى — جَرِّبْ مَرَّةً أُخْرَى.`,
      });
      sound.playWrong();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xl font-black text-ramadan-deep sm:text-2xl">{station.prompt}</p>

      {/* بنك الكلمات */}
      {!done && (
        <div className="rounded-3xl border-2 border-ramadan-gold/60 bg-ramadan-sand p-4">
          <p className="mb-3 text-sm font-black text-ramadan-gold-dark">
            🧺 الْكَلِمَاتُ — اضْغَطْ عَلَى الْكَلِمَةِ لِتَنْزِلَ فِي الْفَرَاغِ الْمُضِيءِ:
          </p>
          <div className="flex min-h-14 flex-wrap justify-center gap-3">
            {available.length === 0 && <span className="text-sm font-bold text-slate-400">تَمَّ اسْتِخْدَامُ كُلِّ الْكَلِمَاتِ</span>}
            {available.map((word) => (
              <button
                key={word}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", word);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => placeNext(word)}
                className={`cursor-pointer rounded-2xl border-2 border-emerald-200 bg-white px-4 py-2 font-extrabold text-ramadan-deep shadow-sm transition hover:-translate-y-1 hover:border-ramadan-green hover:bg-ramadan-mint active:scale-95 ${fontClass}`}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الجمل */}
      <div className="space-y-4 rounded-3xl border-2 border-emerald-100 bg-white p-5">
        {station.lines.map((line, li) => (
          <p key={li} className={`font-bold leading-[2.6] text-slate-800 ${fontClass}`}>
            {line.map((tok, ti) => {
              if (typeof tok === "string") return <span key={ti}>{tok}</span>;
              const id = `${li}-${ti}`;
              const value = placed[id];
              const isLocked = Boolean(locked[id]);
              const isWrong = wrongIds.includes(id);
              const isNext = id === nextBlankId && !done;
              return (
                <button
                  key={ti}
                  type="button"
                  onClick={() => onBlankClick(id)}
                  onDragOver={(e) => {
                    if (!isLocked && !done) e.preventDefault();
                  }}
                  onDrop={(e) => onDrop(e, id)}
                  disabled={isLocked}
                  title={value && !isLocked ? "اضغط لإرجاع الكلمة" : undefined}
                  className={`mx-1 inline-flex min-w-28 items-center justify-center rounded-xl border-2 px-3 py-1 align-middle font-extrabold transition ${
                    isLocked
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : isWrong
                        ? "animate-shake border-rose-400 bg-rose-50 text-rose-500"
                        : value
                          ? "border-ramadan-green bg-ramadan-mint text-ramadan-deep hover:border-rose-300 hover:bg-rose-50"
                          : isNext
                            ? "animate-pulse-soft border-dashed border-ramadan-gold bg-amber-50 text-amber-400"
                            : "border-dashed border-slate-300 bg-slate-50 text-slate-300"
                  }`}
                >
                  {value ?? (isNext ? "👈 هُنَا" : "………")}
                </button>
              );
            })}
          </p>
        ))}
      </div>

      <Feedback feedback={feedback} />

      {!done && (
        <div className="flex justify-center">
          <button type="button" className="btn-primary" onClick={check} disabled={!allFilled}>
            ✔ تَحَقَّقْ مِنَ الإِجَابَةِ
          </button>
        </div>
      )}
    </div>
  );
}
