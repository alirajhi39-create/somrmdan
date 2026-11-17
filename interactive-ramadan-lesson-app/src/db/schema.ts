import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** الطلاب: يُعرَّف الطالب باسمه وفصله */
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    classroom: text("classroom").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("students_name_classroom_idx").on(t.name, t.classroom)],
);

/** محاولات الرحلة التعليمية (كل مرة يبدأ فيها الطالب الدرس) */
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    stationsDone: integer("stations_done").notNull().default(0),
    durationSec: integer("duration_sec"),
    certificateName: text("certificate_name"),
  },
  (t) => [index("attempts_student_idx").on(t.studentId)],
);

/** نتيجة كل محطة داخل المحاولة */
export const stationResults = pgTable(
  "station_results",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    stationIndex: integer("station_index").notNull(),
    stationKey: text("station_key").notNull(),
    stationTitle: text("station_title").notNull(),
    /** هل أجاب من أول محاولة؟ */
    correct: boolean("correct").notNull().default(true),
    tries: integer("tries").notNull().default(1),
    points: integer("points").notNull().default(0),
    maxPoints: integer("max_points").notNull().default(0),
    timeSec: integer("time_sec").notNull().default(0),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("station_results_attempt_station_idx").on(t.attemptId, t.stationIndex)],
);

export type Student = typeof students.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type StationResult = typeof stationResults.$inferSelect;
