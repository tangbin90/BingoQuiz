export type Question = {
  id: string;             // 唯一ID
  index: number;          // 第几题（用于顺序/展示）
  text: string;           // 题干
  options: string[];      // 原始选项（未打乱）
  answer: string;         // 正确答案（与 options 中某一项一致）
  // timeLimit已移除，所有题目使用Session的defaultTimeLimit
};

export type SessionOptions = {
  autoAdvance: boolean;   // 反馈后是否自动进下一题
  defaultTimeLimit: number; // 默认题目时长
};

export type QuizType = 'static' | 'live';

export type AnswerRecord = {
  userId: string;
  questionId: string;
  choice: string;
  correct: boolean;
  timeUsed: number;       // ms
  submittedAt: number;    // epoch ms
};

export type LeaderboardItem = { 
  userId: string; 
  name: string; 
  score: number; 
};

export type SessionStatus = 'waiting' | 'running' | 'paused' | 'ended';

export type SessionState = {
  sessionId: string;
  status: SessionStatus;
  currentQuestion?: Question;
  questions: Question[];
  options: SessionOptions;
  quizType: QuizType;
  startedAt?: number;
  timeLimit?: number;
  timerPaused: boolean;
  pausedAt?: number; // 新增：暂停时刻（epoch ms）
  answersLocked: boolean;
  answeredSet: Set<string>; // ${userId}:${questionId}
  leaderboard: LeaderboardItem[];
  participants: Map<string, { name: string; connected: boolean }>;
  version: number;
  autoAdvanceTimer?: NodeJS.Timeout; // Static Quiz自动跳转定时器
};

// Socket.IO Events
export type ClientToServerEvents = {
  'room:join': (data: { sessionId: string; userId: string; name: string }) => void;
  'answer:submit': (data: { 
    sessionId: string; 
    userId: string; 
    questionId: string; 
    choice: string; 
    clientSentAt: number; 
  }) => void;
  
  // Admin events
  'admin:session:start': (data: { 
    sessionId: string; 
    options?: Partial<SessionOptions>; 
    questions?: Question[];
    quizType?: QuizType;
  }) => void;
  'admin:question:set': (data: { 
    sessionId: string; 
    questionId?: string; 
    question?: Question; 
  }) => void;
  'admin:next': (data: { sessionId: string }) => void;
  'admin:prev': (data: { sessionId: string }) => void;
  'admin:timer:pause': (data: { sessionId: string }) => void;
  'admin:timer:resume': (data: { sessionId: string }) => void;
  'admin:answers:lock': (data: { sessionId: string }) => void;
  'admin:answers:unlock': (data: { sessionId: string }) => void;
  'admin:reveal': (data: { sessionId: string }) => void;
  'admin:session:end': (data: { sessionId: string }) => void;
};

export type ServerToClientEvents = {
  'state:sync': (data: {
    version: number;
    status: SessionStatus;
    question?: Question;
    startedAt?: number;
    timeLimit?: number;
    timerPaused: boolean;
    answersLocked: boolean;
    scoreboard: LeaderboardItem[];
    quizType?: QuizType;
  }) => void;
  'question:update': (data: {
    sessionId: string;
    version: number;
    question: Question;
    startedAt: number;
    timeLimit: number;
  }) => void;
  'timer:paused': (data: { sessionId: string; pausedAt: number }) => void;
  'timer:resumed': (data: { sessionId: string; startedAt: number }) => void;
  'answers:locked': (data: { sessionId: string }) => void;
  'answers:unlocked': (data: { sessionId: string }) => void;
  'answer:ack': (data: { correct: boolean; score: number }) => void;
  'answer:rejected': (data: { reason: 'timeout' | 'locked' | 'duplicate' | 'closed' | 'rate-limit' }) => void;
  'score:update': (data: { userId: string; score: number; lastCorrect: boolean }) => void;
  'leaderboard:update': (data: { sessionId: string; items: LeaderboardItem[] }) => void;
  'participants:update': (data: { count: number; items?: { userId: string; name: string }[] }) => void;
  'reveal:answer': (data: { sessionId: string }) => void;
};
