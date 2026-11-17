import type { FeedbackState } from "./types";

export function Feedback({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;
  const styles =
    feedback.kind === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : feedback.kind === "bad"
        ? "border-orange-300 bg-orange-50 text-orange-900"
        : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-pop rounded-2xl border-2 px-4 py-3 text-lg font-bold leading-relaxed ${styles}`}
    >
      {feedback.text}
    </div>
  );
}
