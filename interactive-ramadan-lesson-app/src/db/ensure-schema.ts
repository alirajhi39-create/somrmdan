import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * إنشاء الجداول تلقائيًا (يطابق src/db/schema.ts)
 * - يُستدعى عند إقلاع الخادم (src/instrumentation.ts) وعند كل طلب يحتاج قاعدة البيانات
 * - آمن للتكرار (IF NOT EXISTS) ويعيد المحاولة تلقائيًا إذا فشل اتصال سابق (مثل الإقلاع البارد لـ Neon)
 */
const STATEMENTS = [
  sql`CREATE TABLE IF NOT EXISTS "students" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "classroom" text DEFAULT '' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "students_name_classroom_idx" ON "students" ("name", "classroom")`,
  sql`CREATE TABLE IF NOT EXISTS "attempts" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone,
    "score" integer DEFAULT 0 NOT NULL,
    "max_score" integer DEFAULT 0 NOT NULL,
    "stations_done" integer DEFAULT 0 NOT NULL,
    "duration_sec" integer,
    "certificate_name" text
  )`,
  sql`CREATE INDEX IF NOT EXISTS "attempts_student_idx" ON "attempts" ("student_id")`,
  sql`CREATE TABLE IF NOT EXISTS "station_results" (
    "id" serial PRIMARY KEY NOT NULL,
    "attempt_id" integer NOT NULL REFERENCES "attempts"("id") ON DELETE CASCADE,
    "station_index" integer NOT NULL,
    "station_key" text NOT NULL,
    "station_title" text NOT NULL,
    "correct" boolean DEFAULT true NOT NULL,
    "tries" integer DEFAULT 1 NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "max_points" integer DEFAULT 0 NOT NULL,
    "time_sec" integer DEFAULT 0 NOT NULL,
    "answered_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "station_results_attempt_station_idx" ON "station_results" ("attempt_id", "station_index")`,
  sql`CREATE TABLE IF NOT EXISTS "settings" (
    "key" text PRIMARY KEY NOT NULL,
    "value" jsonb NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  sql`CREATE TABLE IF NOT EXISTS "competitions" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" text NOT NULL UNIQUE,
    "classroom" text DEFAULT '' NOT NULL,
    "status" text DEFAULT 'lobby' NOT NULL,
    "current_index" integer DEFAULT -1 NOT NULL,
    "question_started_at" timestamp with time zone,
    "question_seconds" integer DEFAULT 20 NOT NULL,
    "seed" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "finished_at" timestamp with time zone
  )`,
  sql`CREATE TABLE IF NOT EXISTS "competition_players" (
    "id" serial PRIMARY KEY NOT NULL,
    "competition_id" integer NOT NULL REFERENCES "competitions"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "team" text DEFAULT '' NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    "last_seen" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "competition_players_unique_idx" ON "competition_players" ("competition_id", "name")`,
  sql`CREATE TABLE IF NOT EXISTS "competition_answers" (
    "id" serial PRIMARY KEY NOT NULL,
    "competition_id" integer NOT NULL REFERENCES "competitions"("id") ON DELETE CASCADE,
    "player_id" integer NOT NULL REFERENCES "competition_players"("id") ON DELETE CASCADE,
    "question_index" integer NOT NULL,
    "option_index" integer NOT NULL,
    "correct" boolean DEFAULT false NOT NULL,
    "time_ms" integer DEFAULT 0 NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "answered_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "competition_answers_unique_idx" ON "competition_answers" ("competition_id", "player_id", "question_index")`,
  sql`CREATE TABLE IF NOT EXISTS "sounds" (
    "key" text PRIMARY KEY NOT NULL,
    "filename" text NOT NULL,
    "mime" text NOT NULL,
    "size" integer DEFAULT 0 NOT NULL,
    "data" bytea NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
];

const globalForSchema = globalThis as typeof globalThis & {
  __ramadanSchemaReady?: Promise<void>;
};

async function runWithRetry(attempts = 3): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      for (const statement of STATEMENTS) {
        await db.execute(statement);
      }
      return;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastError;
}

export function ensureSchema(): Promise<void> {
  if (!globalForSchema.__ramadanSchemaReady) {
    globalForSchema.__ramadanSchemaReady = runWithRetry().catch((error) => {
      globalForSchema.__ramadanSchemaReady = undefined;
      throw error;
    });
  }
  return globalForSchema.__ramadanSchemaReady;
}
