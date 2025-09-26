import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { SessionStore } from './sessionStore';
import { ClientToServerEvents, ServerToClientEvents, SessionOptions, Question } from './types';
import { shuffleQuestionOptions } from './utils/seedShuffle';
import { isTimeUp, calculateTimeRemaining } from './utils/time';

// 加载环境变量
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// 会话存储
const sessionStore = new SessionStore();

// 管理员认证已完全移除 - 所有管理员操作直接允许

// Static Quiz自动跳转逻辑
const setupStaticQuizAutoAdvance = (sessionId: string, session: any, io: any) => {
  if (!session.startedAt) {
    console.log(`⏰ Static Quiz session ${sessionId} not started yet, waiting for participant...`);
    return;
  }
  
  const timeLimit = session.timeLimit * 1000; // 转换为毫秒
  const startTime = session.startedAt;
  const endTime = startTime + timeLimit;
  
  console.log(`⏰ Static Quiz auto-advance setup:`, {
    sessionId,
    startTime: new Date(startTime).toLocaleTimeString(),
    timeLimit: session.timeLimit,
    endTime: new Date(endTime).toLocaleTimeString()
  });
  
  // 设置定时器，在时间结束后自动跳转
  const timer = setTimeout(() => {
    console.log(`⏰ Static Quiz auto-advance triggered for session: ${sessionId}`);
    advanceToNextQuestion(sessionId, session, io);
  }, timeLimit);
  
  // 将定时器存储在session中，以便可以清除
  session.autoAdvanceTimer = timer;
};

// 跳转到下一题
const advanceToNextQuestion = (sessionId: string, session: any, io: any) => {
  const currentIndex = session.questions.findIndex((q: any) => q.id === session.currentQuestion?.id);
  const nextIndex = currentIndex + 1;
  
  if (nextIndex < session.questions.length) {
    // 有下一题，跳转
    const nextQuestion = session.questions[nextIndex];
    session.currentQuestion = nextQuestion;
    session.startedAt = Date.now();
    session.timeLimit = nextQuestion.timeLimit || session.options?.defaultTimeLimit || 15;
    
    console.log(`➡️ Static Quiz advancing to question ${nextIndex + 1}: ${nextQuestion.text}`);
    console.log(`⏰ New question startedAt: ${new Date(session.startedAt).toLocaleTimeString()}, timeLimit: ${session.timeLimit}s`);
    
    // 广播新题目
    io.to(sessionId).emit('question:update', {
      question: nextQuestion,
      startedAt: session.startedAt,
      timeLimit: session.timeLimit
    });
    
    // 设置下一题的自动跳转
    setupStaticQuizAutoAdvance(sessionId, session, io);
  } else {
    // 没有更多题目，结束session
    console.log(`🏁 Static Quiz session ${sessionId} completed all questions`);
    session.status = 'ended';
    
    io.to(sessionId).emit('state:sync', {
      version: session.version,
      status: session.status,
      question: null,
      startedAt: null,
      timeLimit: 0,
      timerPaused: false,
      answersLocked: false,
      scoreboard: session.leaderboard,
      quizType: 'static'
    });
  }
};

// 默认题库
const defaultQuestions: Question[] = [
  {
    id: 'q1',
    index: 1,
    text: 'Which philosopher proposed the "veil of ignorance"?',
    options: ['Immanuel Kant', 'John Stuart Mill', 'John Rawls', 'Robert Nozick'],
    answer: 'John Rawls',
    timeLimit: 15
  },
  {
    id: 'q2',
    index: 2,
    text: 'What is the main principle of utilitarianism?',
    options: ['Greatest happiness for the greatest number', 'Categorical imperative', 'Social contract', 'Virtue ethics'],
    answer: 'Greatest happiness for the greatest number',
    timeLimit: 20
  },
  {
    id: 'q3',
    index: 3,
    text: 'Who wrote "The Republic"?',
    options: ['Aristotle', 'Plato', 'Socrates', 'Confucius'],
    answer: 'Plato',
    timeLimit: 10
  }
];

// 加载题库
function loadQuestions(): Question[] {
  try {
    const questionsPath = path.join(__dirname, '../public/questions.json');
    if (fs.existsSync(questionsPath)) {
      const data = fs.readFileSync(questionsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load questions.json:', error);
  }
  return defaultQuestions;
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 加入房间
  socket.on('room:join', (data) => {
    const { sessionId, userId, name } = data;
    console.log(`👤 Participant joining room: ${sessionId}, user: ${userId}, name: ${name}`);
    
    socket.join(sessionId);
    (socket as any).userId = userId;
    (socket as any).sessionId = sessionId;
    
    const session = sessionStore.getSession(sessionId);
    if (session) {
      console.log(`✅ Session found, processing join for: ${userId}`);
      
      // 只有非Host用户才添加到participants
      if (userId !== 'host') {
        sessionStore.addParticipant(sessionId, userId, name);
        sessionStore.updateLeaderboard(sessionId);
        console.log(`👥 Added participant: ${userId} (${name}), total participants: ${session.participants.size}`);
      }
      
      // 对于Static Quiz，如果没有startedAt，为这个参与者设置开始时间
      if (session.quizType === 'static' && !session.startedAt && userId !== 'host') {
        session.startedAt = Date.now();
        console.log(`⏰ Setting startedAt for Static Quiz participant: ${userId}, time: ${new Date(session.startedAt).toLocaleTimeString()}`);
        
        // 启动Static Quiz的自动跳转
        setupStaticQuizAutoAdvance(sessionId, session, io);
      }
      
      // 发送当前状态
      console.log(`📤 Sending state:sync to participant: ${userId}`);
      socket.emit('state:sync', {
        version: session.version,
        status: session.status,
        question: session.currentQuestion,
        startedAt: session.startedAt,
        timeLimit: session.timeLimit,
        timerPaused: session.timerPaused,
        answersLocked: session.answersLocked,
        scoreboard: session.leaderboard,
        quizType: session.quizType
      });
      
      // 通知所有参与者（包括新加入的用户和管理员）
      if (userId !== 'host') {
        console.log('📤 Broadcasting participants:update to all participants in session:', sessionId);
        const participantData = {
          count: session.participants.size,
          items: Array.from(session.participants.entries()).map(([id, p]) => ({ userId: id, name: p.name }))
        };
        console.log('📤 Participant data:', participantData);
        
        // 广播给所有连接到这个session的用户（包括管理员）
        io.to(sessionId).emit('participants:update', participantData);
        
        // 广播排行榜更新
        console.log('📤 Broadcasting leaderboard:update for new participant:', sessionId);
        io.to(sessionId).emit('leaderboard:update', {
          sessionId,
          items: session.leaderboard
        });
      } else {
        // 如果是管理员，也发送当前的参与者信息
        console.log('📤 Sending current participants to admin:', sessionId);
        const participantData = {
          count: session.participants.size,
          items: Array.from(session.participants.entries()).map(([id, p]) => ({ userId: id, name: p.name }))
        };
        socket.emit('participants:update', participantData);
        socket.emit('leaderboard:update', {
          sessionId,
          items: session.leaderboard
        });
      }
    }
  });

  // 提交答案
  socket.on('answer:submit', (data) => {
    const { sessionId, userId, questionId, choice, clientSentAt } = data;
    console.log('📥 Received answer:submit:', { sessionId, userId, questionId, choice });
    const session = sessionStore.getSession(sessionId);
    
    if (!session || !session.currentQuestion) {
      socket.emit('answer:rejected', { reason: 'closed' });
      return;
    }
    
    // 检查是否已回答过
    if (sessionStore.hasUserAnswered(sessionId, userId, questionId)) {
      socket.emit('answer:rejected', { reason: 'duplicate' });
      return;
    }
    
    // 检查是否锁定
    if (session.answersLocked) {
      socket.emit('answer:rejected', { reason: 'locked' });
      return;
    }
    
    // 检查时间限制
    if (session.startedAt && session.timeLimit) {
      const timeLimitMs = session.timeLimit * 1000;
      if (isTimeUp(session.startedAt, timeLimitMs)) {
        socket.emit('answer:rejected', { reason: 'timeout' });
        return;
      }
    }
    
    // 速率限制检查
    if (!sessionStore.checkRateLimit(userId, 3, 1000)) {
      socket.emit('answer:rejected', { reason: 'rate-limit' });
      return;
    }
    
    // 验证答案
    const isCorrect = choice === session.currentQuestion.answer;
    const timeUsed = Date.now() - (session.startedAt || Date.now());
    
    // 记录答案
    sessionStore.markUserAnswered(sessionId, userId, questionId);
    
    // 更新分数
    const scoreDelta = isCorrect ? 1 : 0;
    const newScore = sessionStore.updateUserScore(userId, scoreDelta);
    
    // 更新排行榜
    sessionStore.updateLeaderboard(sessionId);
    
    // 发送确认
    socket.emit('answer:ack', { correct: isCorrect, score: newScore });
    
    // 广播分数更新
    socket.to(sessionId).emit('score:update', { 
      userId, 
      score: newScore, 
      lastCorrect: isCorrect 
    });
    
    // 广播排行榜更新
    const updatedSession = sessionStore.getSession(sessionId);
    if (updatedSession) {
      console.log('📤 Broadcasting leaderboard:update to session:', sessionId, 'items:', updatedSession.leaderboard);
      io.to(sessionId).emit('leaderboard:update', {
        sessionId,
        items: updatedSession.leaderboard
      });
    }
    
    // 对于Static Quiz，在用户提交答案后等待3秒再跳转到下一题
    if (session.quizType === 'static') {
      console.log(`🔄 Static Quiz: User ${userId} submitted answer, will advance to next question in 3 seconds`);
      // 清除当前的自动跳转定时器
      if (session.autoAdvanceTimer) {
        clearTimeout(session.autoAdvanceTimer);
        session.autoAdvanceTimer = undefined;
      }
      // 设置3秒延迟跳转
      setTimeout(() => {
        console.log(`⏰ Static Quiz: 3 seconds elapsed, advancing to next question`);
        advanceToNextQuestion(sessionId, session, io);
      }, 3000);
    }
  });

  // 管理端事件 - 只对admin事件应用认证
  socket.on('admin:session:start', (data) => {
    console.log('📥 Received admin:session:start event:', {
      sessionId: data.sessionId,
      hasOptions: !!data.options,
      questionsCount: data.questions?.length || 0,
      quizType: data.quizType
    });
    
    // 管理员认证已移除，直接允许操作
    console.log('✅ Admin operation allowed (认证已移除)');
    const { sessionId, options, questions, quizType } = data;
    
    const sessionOptions: SessionOptions = {
      autoAdvance: true,
      defaultTimeLimit: 15,
      ...options
    };
    
    const sessionQuestions = questions || loadQuestions();
    
    const session = sessionStore.createSession(sessionId, sessionOptions, sessionQuestions, quizType || 'live');
    session.status = 'running';
    
    // 对于Live Quiz，不自动设置currentQuestion，等待管理员手动选择
    // 对于Static Quiz，设置第一个问题
    if (quizType === 'static') {
      session.currentQuestion = sessionQuestions[0];
    } else {
      session.currentQuestion = undefined; // Live Quiz等待管理员选择
    }
    
    // 管理员加入session房间，以便接收参与者更新
    socket.join(sessionId);
    (socket as any).userId = 'host';
    (socket as any).sessionId = sessionId;
    console.log(`👤 Admin joined session room: ${sessionId}`);
    
    // 对于Static Quiz，不立即设置startedAt，让参与者加入时设置
    // 对于Live Quiz，也不立即设置startedAt，等管理员选择问题后再开始
    if (quizType === 'live') {
      // Live Quiz不自动开始，等待管理员手动选择问题
      session.startedAt = undefined;
      session.timeLimit = sessionOptions.defaultTimeLimit;
      session.currentQuestion = undefined; // 不设置默认问题，等待管理员选择
    } else {
      // Static Quiz不设置startedAt，等参与者加入时设置
      session.timeLimit = session.currentQuestion?.timeLimit || sessionOptions.defaultTimeLimit;
    }
    
    // 广播状态更新
    io.to(sessionId).emit('state:sync', {
      version: session.version,
      status: session.status,
      question: session.currentQuestion,
      startedAt: session.startedAt,
      timeLimit: session.timeLimit,
      timerPaused: session.timerPaused,
      answersLocked: session.answersLocked,
      scoreboard: session.leaderboard,
      quizType: quizType
    });
    
    // 对于Static Quiz，设置自动跳转定时器
    if (quizType === 'static') {
      console.log(`🔄 Setting up Static Quiz auto-advance for session: ${sessionId}`);
      setupStaticQuizAutoAdvance(sessionId, session, io);
    }
    
    console.log(`Session ${sessionId} started`);
  });

  // 设置题目
  socket.on('admin:question:set', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId, questionId, question } = data;
    console.log('Admin setting question:', { sessionId, questionId, question });
    
    const session = sessionStore.getSession(sessionId);
    
    if (!session) {
      console.log('Session not found:', sessionId);
      return;
    }
    
    let targetQuestion: Question | undefined;
    
    if (question) {
      targetQuestion = question;
    } else if (questionId) {
      targetQuestion = session.questions.find(q => q.id === questionId);
    }
    
    if (targetQuestion) {
      console.log('Setting question to:', targetQuestion.text);
      session.currentQuestion = targetQuestion;
      session.startedAt = Date.now();
      session.timeLimit = targetQuestion.timeLimit || session.options.defaultTimeLimit;
      sessionStore.clearCurrentQuestionAnswers(sessionId);
      
      const updatedSession = sessionStore.updateSession(sessionId, {});
      
      if (updatedSession) {
        console.log('Broadcasting question update to session:', sessionId);
        io.to(sessionId).emit('question:update', {
          sessionId,
          version: updatedSession.version,
          question: targetQuestion,
          startedAt: updatedSession.startedAt!,
          timeLimit: updatedSession.timeLimit!
        });
      }
    } else {
      console.log('Target question not found');
    }
  });

  // 下一题
  socket.on('admin:next', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    const session = sessionStore.getSession(sessionId);
    
    if (!session || !session.currentQuestion) return;
    
    const currentIndex = session.questions.findIndex(q => q.id === session.currentQuestion!.id);
    const nextQuestion = session.questions[currentIndex + 1];
    
    if (nextQuestion) {
      session.currentQuestion = nextQuestion;
      session.startedAt = Date.now();
      session.timeLimit = nextQuestion.timeLimit || session.options.defaultTimeLimit;
      sessionStore.clearCurrentQuestionAnswers(sessionId);
      
      const updatedSession = sessionStore.updateSession(sessionId, {});
      
      if (updatedSession) {
        io.to(sessionId).emit('question:update', {
          sessionId,
          version: updatedSession.version,
          question: nextQuestion,
          startedAt: updatedSession.startedAt!,
          timeLimit: updatedSession.timeLimit!
        });
      }
    }
  });

  // 上一题
  socket.on('admin:prev', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    const session = sessionStore.getSession(sessionId);
    
    if (!session || !session.currentQuestion) return;
    
    const currentIndex = session.questions.findIndex(q => q.id === session.currentQuestion!.id);
    const prevQuestion = session.questions[currentIndex - 1];
    
    if (prevQuestion) {
      session.currentQuestion = prevQuestion;
      session.startedAt = Date.now();
      session.timeLimit = prevQuestion.timeLimit || session.options.defaultTimeLimit;
      sessionStore.clearCurrentQuestionAnswers(sessionId);
      
      const updatedSession = sessionStore.updateSession(sessionId, {});
      
      if (updatedSession) {
        io.to(sessionId).emit('question:update', {
          sessionId,
          version: updatedSession.version,
          question: prevQuestion,
          startedAt: updatedSession.startedAt!,
          timeLimit: updatedSession.timeLimit!
        });
      }
    }
  });

  // 暂停计时器
  socket.on('admin:timer:pause', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    const session = sessionStore.getSession(sessionId);
    
    if (session && !session.timerPaused) {
      const now = Date.now();
      sessionStore.updateSession(sessionId, { timerPaused: true, pausedAt: now });
      io.to(sessionId).emit('timer:paused', { sessionId, pausedAt: now });
    }
  });

  // 恢复计时器
  socket.on('admin:timer:resume', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    const session = sessionStore.getSession(sessionId);
    
    if (session && session.timerPaused) {
      const now = Date.now();
      // 计算暂停前已消耗时间：elapsedBeforePause
      const elapsedBeforePause = session.startedAt ? (session.pausedAt ? session.pausedAt - session.startedAt : now - session.startedAt) : 0;
      // 恢复后应设置 startedAt = now - elapsedBeforePause
      const resumedStartedAt = now - elapsedBeforePause;
      sessionStore.updateSession(sessionId, { 
        timerPaused: false,
        startedAt: resumedStartedAt,
        pausedAt: undefined
      });
      io.to(sessionId).emit('timer:resumed', { sessionId, startedAt: resumedStartedAt });
    }
  });

  // 锁定答案
  socket.on('admin:answers:lock', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    sessionStore.updateSession(sessionId, { answersLocked: true });
    io.to(sessionId).emit('answers:locked', { sessionId });
  });

  // 解锁答案
  socket.on('admin:answers:unlock', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    sessionStore.updateSession(sessionId, { answersLocked: false });
    io.to(sessionId).emit('answers:unlocked', { sessionId });
  });

  // 揭示答案
  socket.on('admin:reveal', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    io.to(sessionId).emit('reveal:answer', { sessionId });
  });

  // 结束会话
  socket.on('admin:session:end', (data) => {
    // 管理员认证已移除，直接允许操作
    const { sessionId } = data;
    const session = sessionStore.getSession(sessionId);
    
    // 清除Static Quiz的自动跳转定时器
    if (session && session.autoAdvanceTimer) {
      clearTimeout(session.autoAdvanceTimer);
      session.autoAdvanceTimer = undefined;
      console.log(`🛑 Cleared auto-advance timer for session: ${sessionId}`);
    }
    
    sessionStore.updateSession(sessionId, { status: 'ended' });
    io.to(sessionId).emit('state:sync', {
      version: 0,
      status: 'ended',
      question: undefined,
      startedAt: undefined,
      timeLimit: undefined,
      timerPaused: false,
      answersLocked: false,
      scoreboard: [],
      quizType: session?.quizType || 'live'
    });
  });

  // 断开连接
  socket.on('disconnect', () => {
    const socketSessionId = (socket as any).sessionId;
    const socketUserId = (socket as any).userId;
    if (socketSessionId && socketUserId) {
      sessionStore.removeParticipant(socketSessionId, socketUserId);
      sessionStore.updateLeaderboard(socketSessionId);
      
      const session = sessionStore.getSession(socketSessionId);
      if (session) {
        io.to(socketSessionId).emit('participants:update', {
          count: session.participants.size,
          items: Array.from(session.participants.entries()).map(([id, p]) => ({ userId: id, name: p.name }))
        });
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// API 路由
app.get('/api/questions', (req, res) => {
  res.json(loadQuestions());
});

app.get('/api/sessions', (req, res) => {
  try {
    const sessions = sessionStore.getAllSessions().map(s => ({
      sessionId: s.sessionId,
      status: s.status,
      participants: s.participants.size,
      currentQuestion: s.currentQuestion?.index,
      quizType: s.quizType
    }));
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'Session ID is required' });
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  return res.json({
    ok: true,
    sessionId: session.sessionId,
    status: session.status,
    participants: session.participants.size,
    currentQuestion: session.currentQuestion?.index ?? null,
    quizType: session.quizType
  });
});

// 提供前端文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/`);
  console.log(`🎮 Play interface: http://localhost:${PORT}/play`);
});
