import Link from "next/link";
import type { ReactNode } from "react";

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

export function ErrorScreen({
  message,
  details,
  onRetry,
  onLogout,
  children,
}: {
  message?: string;
  details?: string;
  onRetry?: () => void;
  onLogout?: () => void;
  children?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="card max-w-lg p-8 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-3 text-2xl font-black text-ramadan-deep">{message ?? "تعذر تحميل البيانات"}</h1>
        {details && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{details}</p>}
        <p className="mt-3 text-sm font-bold text-slate-500">
          تأكد من ضبط متغير <code>NEON_DATABASE_URL</code> أو <code>DATABASE_URL</code> في إعدادات Vercel (يُضاف تلقائيًا
          عند ربط Neon من Storage → Neon) ثم أعد المحاولة.
        </p>
        {children && <div className="mt-4 flex justify-center">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button type="button" className="btn-primary" onClick={onRetry}>
              🔄 إعادة المحاولة
            </button>
          )}
          {onLogout && (
            <button type="button" className="btn-ghost" onClick={onLogout}>
              🚪 تسجيل الخروج
            </button>
          )}
          <Link href="/" className="btn-ghost">
            🏠 صفحة الطالب
          </Link>
        </div>
      </section>
    </main>
  );
}
