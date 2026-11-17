export interface StationResultView {
  stationIndex: number;
  stationKey: string;
  stationTitle: string;
  icon: string;
  correct: boolean;
  tries: number;
  points: number;
  maxPoints: number;
  timeSec: number;
  answeredAt: string;
}

export interface AttemptView {
  id: number;
  startedAt: string;
  completedAt: string | null;
  score: number;
  maxScore: number;
  percent: number;
  stationsDone: number;
  durationSec: number | null;
  certificateName: string | null;
  results: StationResultView[];
}

export interface StudentView {
  id: number;
  name: string;
  classroom: string;
  createdAt: string;
  attempts: AttemptView[];
  best: AttemptView | null;
  latest: AttemptView | null;
  lastActivity: string | null;
  completedCount: number;
}

export interface StationStat {
  index: number;
  key: string;
  title: string;
  icon: string;
  maxPoints: number;
  answered: number;
  firstTryCorrect: number;
  avgTries: number;
  avgPercent: number;
}

export interface Overview {
  classroom: string;
  classrooms: string[];
  students: StudentView[];
  totals: {
    students: number;
    attempts: number;
    completed: number;
    inProgress: number;
    avgPercent: number;
    certificates: number;
  };
  stationStats: StationStat[];
}

export interface AttemptDetail {
  attempt: AttemptView;
  student: { id: number; name: string; classroom: string };
}
