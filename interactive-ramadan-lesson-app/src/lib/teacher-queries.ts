import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attempts, stationResults, students } from "@/db/schema";
import { STATIONS, TOTAL_MAX_POINTS, percentOf } from "@/lib/lesson-data";
import type { AttemptDetail, AttemptView, Overview, StationResultView, StationStat, StudentView } from "@/lib/teacher-types";

export type { AttemptDetail, AttemptView, Overview, StationResultView, StationStat, StudentView } from "@/lib/teacher-types";

function toIso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

function iconFor(index: number): string {
  return STATIONS[index]?.icon ?? "📍";
}

function buildStationStats(results: StationResultView[]): StationStat[] {
  return STATIONS.map((s, index) => {
    const rows = results.filter((r) => r.stationIndex === index);
    const answered = rows.length;
    const firstTryCorrect = rows.filter((r) => r.correct).length;
    const avgTries = answered ? rows.reduce((a, r) => a + r.tries, 0) / answered : 0;
    const avgPercent = answered
      ? Math.round(rows.reduce((a, r) => a + percentOf(r.points, r.maxPoints || s.maxPoints), 0) / answered)
      : 0;
    return {
      index,
      key: s.key,
      title: s.title,
      icon: s.icon,
      maxPoints: s.maxPoints,
      answered,
      firstTryCorrect,
      avgTries: Math.round(avgTries * 10) / 10,
      avgPercent,
    };
  });
}

export async function getClassrooms(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ classroom: students.classroom })
    .from(students)
    .orderBy(asc(students.classroom));
  return rows.map((r) => r.classroom).filter((c) => c && c.length > 0);
}

export async function getOverview(classroom?: string): Promise<Overview> {
  const filter = classroom && classroom.trim().length > 0 ? classroom.trim() : "";

  const studentRows = await db
    .select()
    .from(students)
    .where(filter ? eq(students.classroom, filter) : undefined)
    .orderBy(asc(students.classroom), asc(students.name));

  const studentIds = studentRows.map((s) => s.id);
  const attemptRows = studentIds.length
    ? await db
        .select()
        .from(attempts)
        .where(inArray(attempts.studentId, studentIds))
        .orderBy(desc(attempts.startedAt))
    : [];

  const attemptIds = attemptRows.map((a) => a.id);
  const resultRows = attemptIds.length
    ? await db
        .select()
        .from(stationResults)
        .where(inArray(stationResults.attemptId, attemptIds))
        .orderBy(asc(stationResults.stationIndex))
    : [];

  const resultsByAttempt = new Map<number, StationResultView[]>();
  const allResults: StationResultView[] = [];
  for (const r of resultRows) {
    const view: StationResultView = {
      stationIndex: r.stationIndex,
      stationKey: r.stationKey,
      stationTitle: r.stationTitle,
      icon: iconFor(r.stationIndex),
      correct: r.correct,
      tries: r.tries,
      points: r.points,
      maxPoints: r.maxPoints,
      timeSec: r.timeSec,
      answeredAt: new Date(r.answeredAt).toISOString(),
    };
    allResults.push(view);
    const list = resultsByAttempt.get(r.attemptId) ?? [];
    list.push(view);
    resultsByAttempt.set(r.attemptId, list);
  }

  const attemptsByStudent = new Map<number, AttemptView[]>();
  for (const a of attemptRows) {
    const maxScore = a.maxScore || TOTAL_MAX_POINTS;
    const view: AttemptView = {
      id: a.id,
      startedAt: new Date(a.startedAt).toISOString(),
      completedAt: toIso(a.completedAt),
      score: a.score,
      maxScore,
      percent: percentOf(a.score, maxScore),
      stationsDone: a.stationsDone,
      durationSec: a.durationSec,
      certificateName: a.certificateName,
      results: resultsByAttempt.get(a.id) ?? [],
    };
    const list = attemptsByStudent.get(a.studentId) ?? [];
    list.push(view);
    attemptsByStudent.set(a.studentId, list);
  }

  const studentViews: StudentView[] = studentRows.map((s) => {
    const list = attemptsByStudent.get(s.id) ?? [];
    const best = list.reduce<AttemptView | null>((acc, a) => (!acc || a.score > acc.score ? a : acc), null);
    const latest = list[0] ?? null;
    const lastActivity = list.reduce<string | null>((acc, a) => {
      const candidates = [a.startedAt, a.completedAt, ...a.results.map((r) => r.answeredAt)].filter(
        (x): x is string => Boolean(x),
      );
      for (const c of candidates) if (!acc || c > acc) acc = c;
      return acc;
    }, null);
    return {
      id: s.id,
      name: s.name,
      classroom: s.classroom,
      createdAt: new Date(s.createdAt).toISOString(),
      attempts: list,
      best,
      latest,
      lastActivity,
      completedCount: list.filter((a) => a.completedAt).length,
    };
  });

  const completedAttempts = attemptRows.filter((a) => a.completedAt);
  const avgPercent = completedAttempts.length
    ? Math.round(
        completedAttempts.reduce((acc, a) => acc + percentOf(a.score, a.maxScore || TOTAL_MAX_POINTS), 0) /
          completedAttempts.length,
      )
    : 0;

  return {
    classroom: filter,
    classrooms: await getClassrooms(),
    students: studentViews,
    totals: {
      students: studentViews.length,
      attempts: attemptRows.length,
      completed: completedAttempts.length,
      inProgress: attemptRows.length - completedAttempts.length,
      avgPercent,
      certificates: completedAttempts.filter((a) => a.certificateName).length,
    },
    stationStats: buildStationStats(allResults),
  };
}

export async function getAttemptDetail(attemptId: number): Promise<AttemptDetail | null> {
  const rows = await db
    .select({ attempt: attempts, student: students })
    .from(attempts)
    .innerJoin(students, eq(attempts.studentId, students.id))
    .where(eq(attempts.id, attemptId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const results = await db
    .select()
    .from(stationResults)
    .where(eq(stationResults.attemptId, attemptId))
    .orderBy(asc(stationResults.stationIndex));

  const maxScore = row.attempt.maxScore || TOTAL_MAX_POINTS;
  return {
    student: { id: row.student.id, name: row.student.name, classroom: row.student.classroom },
    attempt: {
      id: row.attempt.id,
      startedAt: new Date(row.attempt.startedAt).toISOString(),
      completedAt: toIso(row.attempt.completedAt),
      score: row.attempt.score,
      maxScore,
      percent: percentOf(row.attempt.score, maxScore),
      stationsDone: row.attempt.stationsDone,
      durationSec: row.attempt.durationSec,
      certificateName: row.attempt.certificateName,
      results: results.map((r) => ({
        stationIndex: r.stationIndex,
        stationKey: r.stationKey,
        stationTitle: r.stationTitle,
        icon: iconFor(r.stationIndex),
        correct: r.correct,
        tries: r.tries,
        points: r.points,
        maxPoints: r.maxPoints,
        timeSec: r.timeSec,
        answeredAt: new Date(r.answeredAt).toISOString(),
      })),
    },
  };
}
