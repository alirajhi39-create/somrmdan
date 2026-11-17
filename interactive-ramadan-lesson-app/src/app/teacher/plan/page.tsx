import PrintToolbar from "@/components/teacher/PrintToolbar";
import {
  GRADE,
  LESSON_NUMBER,
  LESSON_OBJECTIVES,
  LESSON_PAGES,
  LESSON_PLAN_STEPS,
  LESSON_STRATEGIES,
  LESSON_TITLE_PLAIN,
  LESSON_TOPICS,
  SCHOOL_NAME,
  SECTIONS,
  STATIONS,
  SUBJECT,
  TOTAL_MAX_POINTS,
} from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  learn: "بطاقة تعلّم",
  mcq: "اختيار من متعدد",
  order: "ترتيب",
  fill: "إكمال فراغات",
  truefalse: "صح / خطأ",
};

export default function LessonPlanPage() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <PrintToolbar filename="خطة-درس-صوم-رمضان.pdf" />

      <main id="report-root" dir="rtl" className="mx-auto max-w-4xl bg-white px-6 py-8 text-slate-800">
        <header className="flex items-start justify-between gap-4 border-b-4 border-[#0f766e] pb-4">
          <div>
            <p className="text-xl font-black text-[#0b4f3f]">🕌 {SCHOOL_NAME}</p>
            <p className="text-sm font-bold text-slate-500">
              {SUBJECT} • {GRADE} • {SECTIONS.join(" / ")}
            </p>
          </div>
          <div className="text-left text-sm font-bold text-slate-500">
            <p>الدرس {LESSON_NUMBER}</p>
            <p>ص {LESSON_PAGES}</p>
          </div>
        </header>

        <h1 className="mt-6 text-center text-3xl font-black text-[#0b4f3f]">خطة درس «{LESSON_TITLE_PLAIN}» واستراتيجيات التدريس</h1>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {LESSON_TOPICS.map((t) => (
            <div key={t.label} className="rounded-2xl border-2 border-[#e6f4f1] bg-[#f7fbfa] px-3 py-2 text-center text-sm font-black text-[#0b4f3f]">
              {t.icon} {t.label}
            </div>
          ))}
        </section>

        <section className="mt-6 print-break-inside-avoid">
          <h2 className="mb-2 text-xl font-black text-[#0b4f3f]">🎯 أهداف الدرس</h2>
          <ol className="list-inside list-decimal space-y-1 text-base font-bold text-slate-700">
            {LESSON_OBJECTIVES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-xl font-black text-[#0b4f3f]">📚 الاستراتيجيات المستخدمة</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#0f766e] text-white">
                <th className="border border-[#0f766e] px-2 py-2 text-right">الاستراتيجية</th>
                <th className="border border-[#0f766e] px-2 py-2 text-right">الوصف</th>
                <th className="border border-[#0f766e] px-2 py-2">موضع التطبيق</th>
                <th className="border border-[#0f766e] px-2 py-2 text-right">دور المعلم</th>
              </tr>
            </thead>
            <tbody>
              {LESSON_STRATEGIES.map((s) => (
                <tr key={s.name} className="odd:bg-white even:bg-[#f7fbfa]">
                  <td className="border border-slate-200 px-2 py-1.5 font-black">
                    {s.icon} {s.name}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 font-bold">{s.desc}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center text-xs font-black text-[#0f766e]">{s.stations}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-600">{s.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 print-break-inside-avoid">
          <h2 className="mb-2 text-xl font-black text-[#0b4f3f]">🕒 سير الدرس (45 دقيقة)</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {LESSON_PLAN_STEPS.map((p) => (
              <div key={p.phase} className="rounded-2xl border-2 border-[#d4a017]/50 bg-[#fdf8ea] p-3">
                <p className="font-black text-[#b8860b]">{p.phase}</p>
                <ul className="mt-1 list-inside list-disc text-sm font-bold text-slate-700">
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-xl font-black text-[#0b4f3f]">🗺️ محطات الرحلة التفاعلية ({STATIONS.length} محطة • {TOTAL_MAX_POINTS} نقطة)</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#d4a017] text-[#0b4f3f]">
                <th className="border border-[#d4a017] px-2 py-2">#</th>
                <th className="border border-[#d4a017] px-2 py-2 text-right">المحطة</th>
                <th className="border border-[#d4a017] px-2 py-2">النوع</th>
                <th className="border border-[#d4a017] px-2 py-2">النقاط</th>
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s, i) => (
                <tr key={s.key} className="odd:bg-white even:bg-[#fdf8ea]">
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold">{i + 1}</td>
                  <td className="border border-slate-200 px-2 py-1 font-black">
                    {s.icon} {s.title} <span className="text-xs font-bold text-slate-500">— {s.subtitle}</span>
                  </td>
                  <td className="border border-slate-200 px-2 py-1 text-center text-xs font-bold">{TYPE_LABELS[s.type]}</td>
                  <td className="border border-slate-200 px-2 py-1 text-center font-black">{s.maxPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 print-break-inside-avoid">
          <div className="rounded-2xl border-2 border-[#e6f4f1] p-4">
            <h3 className="font-black text-[#0b4f3f]">🧰 الوسائل والمصادر</h3>
            <ul className="mt-1 list-inside list-disc text-sm font-bold text-slate-700">
              <li>كتاب الطالب ص 35–36.</li>
              <li>السبورة التفاعلية/جهاز العرض لتشغيل الرحلة والمسابقة المباشرة.</li>
              <li>أجهزة الطلاب (لوحية/حاسوب) للمحطات والمسابقة.</li>
              <li>بطاقات الكلمات (الطاعة والصبر – التراويح – تقوى الله).</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#e6f4f1] p-4">
            <h3 className="font-black text-[#0b4f3f]">📝 التقويم</h3>
            <ul className="mt-1 list-inside list-disc text-sm font-bold text-slate-700">
              <li>تكويني: التغذية الراجعة الفورية في كل محطة.</li>
              <li>ختامي: أسئلة التقويم (المحطات 1، 4، 6) والمسابقة المباشرة.</li>
              <li>تقارير لوحة المعلم: نسبة الإتقان لكل محطة وكل طالب.</li>
              <li>الواجب: حفظ آية وجوب الصيام وحديث فضل الصوم.</li>
            </ul>
          </div>
        </section>

        <footer className="mt-10 flex items-end justify-between text-sm font-black text-[#0b4f3f] print-break-inside-avoid">
          <div className="text-center">
            <p>معلم/ة المادة</p>
            <div className="mt-8 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
          <div className="text-center">
            <p>المشرف/ة التربوي/ة</p>
            <div className="mt-8 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
          <div className="text-center">
            <p>مدير/ة المدرسة</p>
            <div className="mt-8 w-48 border-t-2 border-[#0b4f3f]" />
          </div>
        </footer>
      </main>
    </div>
  );
}
