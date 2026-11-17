export type CompetitionStatus = "lobby" | "question" | "reveal" | "finished";

export interface PlayerView {
  id: number;
  name: string;
  team: string;
  score: number;
  rank: number;
}

export interface TeamView {
  name: string;
  score: number;
  players: number;
}

export interface MyAnswer {
  optionIndex: number;
  correct: boolean;
  points: number;
}

export interface CompetitionState {
  code: string;
  classroom: string;
  status: CompetitionStatus;
  currentIndex: number;
  totalQuestions: number;
  questionSeconds: number;
  questionStartedAt: string | null;
  serverNow: string;
  question: { prompt: string; options: string[]; answer: number | null; explain: string | null } | null;
  answersCount: number;
  optionCounts: number[] | null;
  players: PlayerView[];
  teams: TeamView[];
  me: (PlayerView & { answer: MyAnswer | null }) | null;
}
