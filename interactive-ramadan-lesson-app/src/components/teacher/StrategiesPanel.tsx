import Link from "next/link";
import { LESSON_STRATEGIES } from "@/lib/lesson-data";

export default function StrategiesPanel() {
  return (
    <details className="card overflow-hidden">
      <summary className="cursor-pointer select-none px-5 py-4 text-xl font-black text-ramadan-deep hover:bg-ramadan-mint/40">
        📚 استراتيجيات التدريس المقترحة للدرس
        <span className="mr-2 text-sm font-bold text-slate-500">({LESSON_STRATEGIES.length} استراتيجيات مرتبطة بالمحطات)</span>
      </summary>
      <div className="border-t border-emerald-100 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          {LESSON_STRATEGIES.map((s) => (
            <div key={s.name} className="rounded-2xl border border-emerald-100 bg-white p-4">
              <p className="flex items-center gap-2 text-lg font-black text-ramadan-deep">
                <span className="text-2xl">{s.icon}</span> {s.name}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-600">{s.desc}</p>
              <p className="mt-2 text-xs font-bold text-ramadan-green">📍 {s.stations}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">🛠️ {s.how}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Link href="/teacher/plan" className="btn-primary px-5 py-2 text-base">
            🖨️ خطة الدرس الكاملة (قابلة للطباعة)
          </Link>
        </div>
      </div>
    </details>
  );
}
