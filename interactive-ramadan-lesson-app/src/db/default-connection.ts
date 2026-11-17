/**
 * ⚠️ رابط احتياطي لقاعدة Neon أون لاين المخصصة لهذا التطبيق.
 *
 * يُستخدم فقط عندما لا يتوفر أي من NEON_DATABASE_URL / DATABASE_URL / POSTGRES_URL في بيئة التشغيل
 * (مثلًا عند النشر على Vercel دون ضبط متغيرات البيئة) حتى يعمل التطبيق مباشرة
 * وتُنشأ الجداول تلقائيًا.
 *
 * يُفضَّل ضبط NEON_DATABASE_URL في إعدادات Vercel (Settings → Environment Variables)،
 * ويمكن تغيير كلمة مرور القاعدة في أي وقت من لوحة Neon ثم تحديث المتغير.
 */
export const FALLBACK_DATABASE_URL =
  "postgresql://neondb_owner:npg_nZGL2MD0bkYj@ep-raspy-pine-bes1gph0-pooler.c-9.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
