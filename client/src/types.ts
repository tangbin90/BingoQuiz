export type Question = {
  id: string;
  index: number;
  text: string;
  options: string[];
  answer: string;
  timeLimit?: number;
};

export type SessionOptions = {
  autoAdvance: boolean;
  defaultTimeLimit: number;
};

export type LeaderboardItem = {
  userId: string;
  name: string;
  score: number;
};

export type SessionStatus = 'waiting' | 'running' | 'paused' | 'ended';

export type QuizState = {
  version: number;
  status: SessionStatus;
  question?: Question;
  startedAt?: number;
  timeLimit?: number;
  timerPaused: boolean;
  answersLocked: boolean;
  scoreboard: LeaderboardItem[];
  quizType?: 'static' | 'live';
};

export type UserAnswer = {
  questionId: string;
  choice: string;
  correct: boolean;
  submittedAt: number;
};

export type Participant = {
  userId: string;
  name: string;
  connected: boolean;
};
