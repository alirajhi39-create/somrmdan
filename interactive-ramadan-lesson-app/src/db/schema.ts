import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** الطلاب: يُعرَّف الطالب باسمه وشعبته */
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

/** إعدادات عامة يتحكم بها المعلم (الصوت، المسابقة...) */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** المسابقات المباشرة على السبورة */
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  classroom: text("classroom").notNull().default(""),
  status: text("status").notNull().default("lobby"),
  currentIndex: integer("current_index").notNull().default(-1),
  questionStartedAt: timestamp("question_started_at", { withTimezone: true }),
  questionSeconds: integer("question_seconds").notNull().default(20),
  seed: integer("seed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const competitionPlayers = pgTable(
  "competition_players",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    team: text("team").notNull().default(""),
    score: integer("score").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("competition_players_unique_idx").on(t.competitionId, t.name)],
);

export const competitionAnswers = pgTable(
  "competition_answers",
  {
    id: serial("id").primaryKey(),
    competitionId: integer("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => competitionPlayers.id, { onDelete: "cascade" }),
    questionIndex: integer("question_index").notNull(),
    optionIndex: integer("option_index").notNull(),
    correct: boolean("correct").notNull().default(false),
    timeMs: integer("time_ms").notNull().default(0),
    points: integer("points").notNull().default(0),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("competition_answers_unique_idx").on(t.competitionId, t.playerId, t.questionIndex)],
);

export type Student = typeof students.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type StationResult = typeof stationResults.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type CompetitionPlayer = typeof competitionPlayers.$inferSelect;
