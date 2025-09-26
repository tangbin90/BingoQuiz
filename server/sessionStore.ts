import { SessionState, SessionOptions, Question, LeaderboardItem, QuizType } from './types';

export class SessionStore {
  private sessions = new Map<string, SessionState>();
  private userScores = new Map<string, number>(); // userId -> score
  private userRateLimits = new Map<string, number[]>(); // userId -> timestamps

  createSession(sessionId: string, options: SessionOptions, questions: Question[], quizType: QuizType = 'live'): SessionState {
    const session: SessionState = {
      sessionId,
      status: 'waiting',
      questions,
      options,
      quizType,
      timerPaused: false,
      answersLocked: false,
      answeredSet: new Set(),
      leaderboard: [],
      participants: new Map(),
      version: 0
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionState>): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    Object.assign(session, updates);
    session.version++;
    return session;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // 用户分数管理
  getUserScore(userId: string): number {
    return this.userScores.get(userId) || 0;
  }

  updateUserScore(userId: string, delta: number): number {
    const currentScore = this.getUserScore(userId);
    const newScore = Math.max(0, currentScore + delta);
    this.userScores.set(userId, newScore);
    return newScore;
  }

  // 防作弊：检查用户是否已回答过某题
  hasUserAnswered(sessionId: string, userId: string, questionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const key = `${userId}:${questionId}`;
    return session.answeredSet.has(key);
  }

  markUserAnswered(sessionId: string, userId: string, questionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const key = `${userId}:${questionId}`;
    session.answeredSet.add(key);
  }

  // 清理当前题目的回答记录
  clearCurrentQuestionAnswers(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.answeredSet.clear();
  }

  // 更新排行榜
  updateLeaderboard(sessionId: string): LeaderboardItem[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const leaderboard: LeaderboardItem[] = [];
    
    for (const [userId, participant] of session.participants) {
      if (participant.connected) {
        leaderboard.push({
          userId,
          name: participant.name,
          score: this.getUserScore(userId)
        });
      }
    }

    // 按分数降序排列
    leaderboard.sort((a, b) => b.score - a.score);
    session.leaderboard = leaderboard;
    
    return leaderboard;
  }

  // 速率限制检查
  checkRateLimit(userId: string, maxRequests: number = 3, windowMs: number = 1000): boolean {
    const now = Date.now();
    const userRequests = this.userRateLimits.get(userId) || [];
    
    // 清理过期的请求记录
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // 超过限制
    }
    
    validRequests.push(now);
    this.userRateLimits.set(userId, validRequests);
    return true;
  }

  // 添加参与者
  addParticipant(sessionId: string, userId: string, name: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.participants.set(userId, { name, connected: true });
  }

  // 移除参与者
  removeParticipant(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const participant = session.participants.get(userId);
    if (participant) {
      participant.connected = false;
    }
  }

  // 获取所有活跃会话
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  // 清理过期会话（可选）
  cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      // 这里可以添加会话过期逻辑
      // 例如：检查最后活动时间等
    }
  }
}
