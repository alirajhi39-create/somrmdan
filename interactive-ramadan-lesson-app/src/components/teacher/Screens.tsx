import Link from "next/link";

export function LoadingScreen({ text = "جارٍ تحميل البيانات..." }: { text?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card flex items-center gap-4 px-8 py-6">
        <span className="animate-float text-4xl">🌙</span>
        <p className="text-lg font-black text-ramadan-deep">{text}</p>
      </div>
    </main>
  );
}

export function AuthRequiredScreen() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="card max-w-md p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-2xl font-black text-ramadan-deep">يلزم تسجيل دخول المعلم</h1>
        <p className="mt-2 font-bold text-slate-500">سجّل الدخول من لوحة المعلم ثم افتح التقرير مرة أخرى.</p>
        <Link href="/teacher" className="btn-primary mt-5">
          👨‍🏫 الذهاب إلى لوحة المعلم
        </Link>
      </section>
    </main>
  );
}

export function ErrorScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="card max-w-lg p-8 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-3 text-2xl font-black text-ramadan-deep">{message ?? "تعذر تحميل البيانات"}</h1>
        <p className="mt-2 font-bold text-slate-500">
          تأكد من اتصال قاعدة البيانات (متغير <code>DATABASE_URL</code> يُضاف تلقائيًا عند ربط Neon من لوحة Vercel).
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button type="button" className="btn-primary" onClick={onRetry}>
              🔄 إعادة المحاولة
            </button>
          )}
          <Link href="/teacher" className="btn-ghost">
            لوحة المعلم
          </Link>
        </div>
      </section>
    </main>
  );
}
