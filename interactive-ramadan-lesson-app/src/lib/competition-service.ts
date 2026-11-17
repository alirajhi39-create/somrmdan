import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitionAnswers, competitionPlayers, competitions, type Competition } from "@/db/schema";
import { TOTAL_COMPETITION_QUESTIONS, getCompetitionQuestion, scoreFor } from "@/lib/competition-data";
import type { CompetitionState, CompetitionStatus, TeamView } from "@/lib/competition-types";
import { SECTIONS } from "@/lib/lesson-data";

export class CompetitionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function findByCode(code: string): Promise<Competition | null> {
  const [row] = await db.select().from(competitions).where(eq(competitions.code, code)).limit(1);
  return row ?? null;
}

export async function createCompetition(classroom: string, seconds: number): Promise<Competition> {
  for (let i = 0; i < 12; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const exists = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.code, code)).limit(1);
    if (exists.length) continue;
    const [row] = await db
      .insert(competitions)
      .values({ code, classroom, questionSeconds: seconds, seed: Math.floor(Math.random() * 1_000_000_000) })
      .returning();
    return row;
  }
  throw new CompetitionError("تعذر توليد رمز للمسابقة، حاول مرة أخرى", 500);
}

export async function getState(code: string, playerId?: number): Promise<CompetitionState | null> {
  const comp = await findByCode(code);
  if (!comp) return null;

  const players = await db
    .select()
    .from(competitionPlayers)
    .where(eq(competitionPlayers.competitionId, comp.id))
    .orderBy(desc(competitionPlayers.score), asc(competitionPlayers.joinedAt));

  const question = comp.currentIndex >= 0 ? getCompetitionQuestion(comp.currentIndex, comp.seed) : null;
  const reveal = comp.status === "reveal" || comp.status === "finished";

  let answersCount = 0;
  let optionCounts: number[] | null = null;
  let myAnswer: { optionIndex: number; correct: boolean; points: number } | null = null;

  if (question) {
    const answers = await db
      .select()
      .from(competitionAnswers)
      .where(and(eq(competitionAnswers.competitionId, comp.id), eq(competitionAnswers.questionIndex, comp.currentIndex)));
    answersCount = answers.length;
    optionCounts = question.options.map((_, i) => answers.filter((a) => a.optionIndex === i).length);
    if (playerId) {
      const mine = answers.find((a) => a.playerId === playerId);
      if (mine) myAnswer = { optionIndex: mine.optionIndex, correct: mine.correct, points: mine.points };
    }
  }

  const ranked = players.map((p, i) => ({ id: p.id, name: p.name, team: p.team, score: p.score, rank: i + 1 }));
  const teamNames = Array.from(new Set([...SECTIONS, ...players.map((p) => p.team).filter(Boolean)]));
  const teams: TeamView[] = teamNames.map((name) => {
    const members = players.filter((p) => p.team === name);
    return { name, score: members.reduce((a, p) => a + p.score, 0), players: members.length };
  });
  const me = playerId ? (ranked.find((p) => p.id === playerId) ?? null) : null;

  return {
    code: comp.code,
    classroom: comp.classroom,
    status: comp.status as CompetitionStatus,
    currentIndex: comp.currentIndex,
    totalQuestions: TOTAL_COMPETITION_QUESTIONS,
    questionSeconds: comp.questionSeconds,
    questionStartedAt: comp.questionStartedAt ? new Date(comp.questionStartedAt).toISOString() : null,
    serverNow: new Date().toISOString(),
    question: question
      ? {
          prompt: question.prompt,
          options: question.options,
          answer: reveal ? question.answer : null,
          explain: reveal ? question.explain : null,
        }
      : null,
    answersCount,
    optionCounts: reveal ? optionCounts : null,
    players: ranked,
    teams,
    me: me ? { ...me, answer: myAnswer } : null,
  };
}

export async function joinCompetition(code: string, name: string, team: string) {
  const comp = await findByCode(code);
  if (!comp) throw new CompetitionError("لا توجد مسابقة بهذا الرمز", 404);
  if (comp.status === "finished") throw new CompetitionError("انتهت هذه المسابقة", 410);
  const [player] = await db
    .insert(competitionPlayers)
    .values({ competitionId: comp.id, name, team })
    .onConflictDoUpdate({
      target: [competitionPlayers.competitionId, competitionPlayers.name],
      set: { team, lastSeen: new Date() },
    })
    .returning();
  return { playerId: player.id, name: player.name, team: player.team, status: comp.status };
}

export async function submitAnswer(code: string, playerId: number, optionIndex: number) {
  const comp = await findByCode(code);
  if (!comp) throw new CompetitionError("لا توجد مسابقة بهذا الرمز", 404);
  if (comp.status !== "question" || !comp.questionStartedAt) {
    throw new CompetitionError("لا يوجد سؤال مفتوح الآن", 409);
  }
  const question = getCompetitionQuestion(comp.currentIndex, comp.seed);
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) {
    throw new CompetitionError("خيار غير صحيح", 400);
  }
  const [player] = await db.select().from(competitionPlayers).where(eq(competitionPlayers.id, playerId)).limit(1);
  if (!player || player.competitionId !== comp.id) throw new CompetitionError("اللاعب غير مسجل في هذه المسابقة", 403);

  const limitMs = comp.questionSeconds * 1000;
  const elapsedMs = Date.now() - new Date(comp.questionStartedAt).getTime();
  if (elapsedMs > limitMs + 2500) throw new CompetitionError("انتهى وقت السؤال", 409);

  const correct = optionIndex === question.answer;
  const points = scoreFor(correct, Math.min(elapsedMs, limitMs), limitMs);

  const inserted = await db
    .insert(competitionAnswers)
    .values({
      competitionId: comp.id,
      playerId,
      questionIndex: comp.currentIndex,
      optionIndex,
      correct,
      timeMs: Math.max(0, Math.round(elapsedMs)),
      points,
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted.length) {
    throw new CompetitionError("تم استلام إجابتك مسبقًا لهذا السؤال", 409);
  }

  if (points > 0) {
    await db
      .update(competitionPlayers)
      .set({ score: sql`${competitionPlayers.score} + ${points}`, lastSeen: new Date() })
      .where(eq(competitionPlayers.id, playerId));
  }

  return { correct, points };
}

export type ControlAction = "start" | "next" | "reveal" | "finish";

export async function controlCompetition(code: string, action: ControlAction): Promise<Competition> {
  const comp = await findByCode(code);
  if (!comp) throw new CompetitionError("لا توجد مسابقة بهذا الرمز", 404);

  let patch: Partial<typeof competitions.$inferInsert> = {};
  switch (action) {
    case "start":
    case "next": {
      const nextIndex = comp.currentIndex + 1;
      if (nextIndex >= TOTAL_COMPETITION_QUESTIONS) {
        patch = { status: "finished", finishedAt: new Date() };
      } else {
        patch = { status: "question", currentIndex: nextIndex, questionStartedAt: new Date() };
      }
      break;
    }
    case "reveal":
      if (comp.status === "question") patch = { status: "reveal" };
      break;
    case "finish":
      patch = { status: "finished", finishedAt: new Date() };
      break;
  }

  if (Object.keys(patch).length === 0) return comp;
  const [updated] = await db.update(competitions).set(patch).where(eq(competitions.id, comp.id)).returning();
  return updated;
}
