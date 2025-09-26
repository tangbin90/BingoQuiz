import { useState, useEffect, useCallback, useRef } from 'react';
import { socketManager } from './socket';
import { QuizState, Question, LeaderboardItem } from '../types';
import { shuffleQuestionOptions } from '../utils/seedShuffle';

export function useQuizLive(userId: string, sessionId: string) {
  console.log('🔍 useQuizLive called with:', { userId, sessionId });
  
  const [state, setState] = useState<QuizState>({
    version: 0,
    status: 'waiting',
    timerPaused: false,
    answersLocked: false,
    scoreboard: [],
    quizType: undefined as any // 初始时不设置quizType，等待服务器发送
  });
  
  const [timeRemaining, setTimeRemaining] = useState(0);
  // const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [userScore, setUserScore] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [feedbackCountdown, setFeedbackCountdown] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 确保participant端有socket连接
  useEffect(() => {
    console.log('🔌 useQuizLive useEffect called, isConnected:', socketManager.isConnected());
    if (!socketManager.isConnected()) {
      console.log('🔌 Participant connecting to server...');
      socketManager.connect(); // 不传adminToken，作为participant连接
    }
  }, []);
  
  const socket = socketManager.getSocket();

  // 加入房间
  const joinRoom = useCallback((name: string) => {
    if (socket) {
      console.log(`🚀 Joining room: ${sessionId}, user: ${userId}, name: ${name}`);
      socket.emit('room:join', { sessionId, userId, name });
    } else {
      console.error('❌ Socket not available for joining room');
    }
  }, [socket, sessionId, userId]);

  // 提交答案
  const submitAnswer = useCallback((choice: string) => {
    if (!socket || !state.question || isSubmitted || state.answersLocked) {
      console.log('❌ Cannot submit answer:', { socket: !!socket, question: !!state.question, isSubmitted, answersLocked: state.answersLocked });
      return;
    }

    const clientSentAt = Date.now();
    console.log('📤 Submitting answer:', { sessionId, userId, questionId: state.question.id, choice });
    socket.emit('answer:submit', {
      sessionId,
      userId,
      questionId: state.question.id,
      choice,
      clientSentAt
    });

    setSelectedChoice(choice);
    setIsSubmitted(true);
  }, [socket, sessionId, userId, state.question, isSubmitted, state.answersLocked]);

  // 重置当前题目的状态
  const resetQuestionState = useCallback(() => {
    setSelectedChoice('');
    setIsSubmitted(false);
    setFeedback(null);
    setIsRevealed(false);
  }, []);

  // 更新计时器（暂停时保持当前显示，不清零）
  const updateTimer = useCallback(() => {
    if (!state.startedAt || !state.timeLimit) {
      console.log('⏰ Timer update skipped:', { startedAt: state.startedAt, timeLimit: state.timeLimit });
      setTimeRemaining(0);
      return;
    }

    const now = Date.now();
    const elapsed = now - state.startedAt;
    const remaining = Math.max(0, (state.timeLimit * 1000) - elapsed);
    const remainingSeconds = Math.ceil(remaining / 1000);
    
    console.log('⏰ Timer update:', {
      now: new Date(now).toLocaleTimeString(),
      startedAt: new Date(state.startedAt).toLocaleTimeString(),
      elapsed: Math.floor(elapsed / 1000) + 's',
      timeLimit: state.timeLimit + 's',
      remaining: remainingSeconds + 's',
      questionId: state.question?.id,
      questionText: state.question?.text?.substring(0, 50) + '...'
    });
    
    setTimeRemaining(remainingSeconds);

    if (remaining <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [state.startedAt, state.timeLimit]);

  // 启动计时器
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (state.status === 'running' && state.startedAt && state.timeLimit && !state.timerPaused) {
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.status, state.startedAt, state.timeLimit, state.timerPaused]);

  // 处理选项打乱
  useEffect(() => {
    if (state.question && userId) {
      const shuffled = shuffleQuestionOptions(state.question.options, userId, state.question.id);
      setShuffledOptions(shuffled);
      resetQuestionState();
    }
  }, [state.question, userId, resetQuestionState]);

  // 处理Static Quiz的反馈倒计时
  useEffect(() => {
    if (feedbackCountdown > 0 && state.quizType === 'static') {
      const countdownInterval = setInterval(() => {
        setFeedbackCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Clear feedback and reset question state for next question
            setFeedback(null);
            setFeedbackCountdown(0);
            resetQuestionState();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [feedbackCountdown, state.quizType, resetQuestionState]);

  // Socket事件监听
  useEffect(() => {
    if (!socket) return;

    const handleStateSync = (data: QuizState) => {
      console.log('📥 Received state:sync:', {
        status: data.status,
        hasQuestion: !!data.question,
        questionText: data.question?.text,
        startedAt: data.startedAt,
        timeLimit: data.timeLimit,
        startedAtTime: data.startedAt ? new Date(data.startedAt).toLocaleTimeString() : 'None',
        quizType: data.quizType
      });
      
      setState(prev => ({
        ...data,
        status: data.question ? 'running' : data.status,
        timerPaused: data.timerPaused
      }));
      
      if (data.question) {
        console.log('📥 Processing question:', data.question.text);
        const shuffled = shuffleQuestionOptions(data.question.options, userId, data.question.id);
        setShuffledOptions(shuffled);
        resetQuestionState();
      } else {
        console.log('📥 No question in state:sync');
      }
    };

    const handleQuestionUpdate = (data: { question: Question; startedAt: number; timeLimit: number }) => {
      console.log('📥 Received question:update:', {
        questionText: data.question?.text,
        startedAt: data.startedAt,
        timeLimit: data.timeLimit,
        startedAtTime: data.startedAt ? new Date(data.startedAt).toLocaleTimeString() : 'None'
      });
      
      setState(prev => ({
        ...prev,
        status: 'running',
        timerPaused: false,
        question: data.question,
        startedAt: data.startedAt,
        timeLimit: data.timeLimit
      }));
      
      const shuffled = shuffleQuestionOptions(data.question.options, userId, data.question.id);
      setShuffledOptions(shuffled);
      resetQuestionState();
      
      // 立即更新计时器，确保倒计时重置
      setTimeout(() => {
        console.log('🔄 Force updating timer after question update');
        updateTimer();
      }, 100);
    };

    const handleTimerPaused = () => {
      setState(prev => ({ ...prev, timerPaused: true }));
    };

    const handleTimerResumed = (data: { startedAt: number }) => {
      setState(prev => ({ ...prev, timerPaused: false, startedAt: data?.startedAt ?? prev.startedAt }));
    };

    const handleAnswersLocked = () => {
      setState(prev => ({ ...prev, answersLocked: true }));
    };

    const handleAnswersUnlocked = () => {
      setState(prev => ({ ...prev, answersLocked: false }));
    };

    const handleAnswerAck = (data: { correct: boolean; score: number }) => {
      setUserScore(data.score);
      setFeedback({
        correct: data.correct,
        message: data.correct ? 'Correct!' : 'Incorrect!'
      });

      setState(currentState => {
        if (currentState.quizType === 'static') {
          setFeedbackCountdown(3);
        }
        return currentState;
      });
    };

    const handleAnswerRejected = (data: { reason: string }) => {
      setFeedback({
        correct: false,
        message: `Answer rejected: ${data.reason}`
      });
    };

    const handleScoreUpdate = (data: { userId: string; score: number; lastCorrect: boolean }) => {
      if (data.userId === userId) {
        setUserScore(data.score);
      }
    };

    const handleLeaderboardUpdate = (data: { items: LeaderboardItem[] }) => {
      setState(prev => ({ ...prev, scoreboard: data.items }));
    };

    const handleRevealAnswer = () => {
      setIsRevealed(true);
    };

    socket.on('state:sync', handleStateSync);
    socket.on('question:update', handleQuestionUpdate);
    socket.on('timer:paused', handleTimerPaused);
    socket.on('timer:resumed', handleTimerResumed);
    socket.on('answers:locked', handleAnswersLocked);
    socket.on('answers:unlocked', handleAnswersUnlocked);
    socket.on('answer:ack', handleAnswerAck);
    socket.on('answer:rejected', handleAnswerRejected);
    socket.on('score:update', handleScoreUpdate);
    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('reveal:answer', handleRevealAnswer);

    return () => {
      socket.off('state:sync', handleStateSync);
      socket.off('question:update', handleQuestionUpdate);
      socket.off('timer:paused', handleTimerPaused);
      socket.off('timer:resumed', handleTimerResumed);
      socket.off('answers:locked', handleAnswersLocked);
      socket.off('answers:unlocked', handleAnswersUnlocked);
      socket.off('answer:ack', handleAnswerAck);
      socket.off('answer:rejected', handleAnswerRejected);
      socket.off('score:update', handleScoreUpdate);
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('reveal:answer', handleRevealAnswer);
    };
  }, [socket, userId, resetQuestionState]);

  // 计算Static Quiz进度
  const currentQuestionIndex = state.question?.index || 0;
  const totalQuestions = state.questions?.length || 0;
  const answeredQuestions = currentQuestionIndex - 1; // 当前题目索引-1就是已回答的题目数

  return {
    state,
    timeRemaining,
    userScore,
    shuffledOptions,
    selectedChoice,
    isSubmitted,
    feedback,
    isRevealed,
    feedbackCountdown,
    currentQuestionIndex,
    totalQuestions,
    answeredQuestions,
    joinRoom,
    submitAnswer,
    setSelectedChoice,
    isConnected: socketManager.isConnected()
  };
}
