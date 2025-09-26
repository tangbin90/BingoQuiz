import { io, Socket } from 'socket.io-client';
import { Question, SessionOptions, SessionStatus, LeaderboardItem } from '../types';

// Socket.IO event types
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
    quizType?: 'live' | 'static';
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
    quizType?: 'live' | 'static';
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

class SocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isAdmin = false;
  private isConnecting = false;
  private adminToken: string | null = null;

  connect(adminToken?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
    console.log('🔌 SocketManager.connect called, isConnecting:', this.isConnecting, 'isConnected:', this.isConnected(), 'isAdmin:', this.isAdmin, 'adminToken:', !!adminToken);
    
    if (adminToken) {
      this.adminToken = adminToken;
    }

    // 如果正在连接中，返回现有连接
    if (this.isConnecting) {
      console.log('🔌 Already connecting, returning existing socket');
      return this.socket!;
    }

    // 如果已经连接且token相同，直接返回现有连接
    if (this.socket?.connected && this.isAdmin === !!adminToken) {
      console.log('🔌 Already connected with same token, returning existing socket');
      return this.socket;
    }

    // 如果已有连接但token不同，先断开
    if (this.socket) {
      this.socket.disconnect();
    }

    this.isConnecting = true;
    this.isAdmin = !!adminToken;
    
    this.socket = io('http://localhost:3001', {
      auth: {
        adminToken: adminToken || this.adminToken || undefined,
        quizType: this.isAdmin ? undefined : 'participant'
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isAdminMode(): boolean {
    return this.isAdmin;
  }

  setAdminToken(token: string) {
    this.adminToken = token;
  }

  getAdminToken(): string | null {
    return this.adminToken;
  }
}

export const socketManager = new SocketManager();