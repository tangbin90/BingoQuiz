import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socketManager } from '../realtime/socket';
import { Question, SessionOptions } from '../types';

export const Host: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>({
    autoAdvance: true,
    defaultTimeLimit: 15
  });
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; name: string; score: number }>>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [userHasInteracted, setUserHasInteracted] = useState<boolean>(false);
  const [serverStartedAt, setServerStartedAt] = useState<number | null>(null);
  const [serverTimeLimit, setServerTimeLimit] = useState<number>(0);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [questionHistory, setQuestionHistory] = useState<Array<Question & { completedAt: number }>>([]);
  const sessionStartedRef = useRef<boolean>(false);

  const socket = socketManager.getSocket();


  // 归档当前问题到历史记录
  const archiveCurrentQuestion = useCallback(() => {
    if (currentQuestion) {
      setQuestionHistory(prev => {
        // 检查是否已经存在相同的问题，避免重复添加
        const alreadyExists = prev.some(item => item.id === currentQuestion.id);
        if (alreadyExists) {
          console.log('Question already in history, skipping:', currentQuestion.id);
          return prev;
        }
        console.log('Question archived to history due to timer end:', currentQuestion.id);
        return [...prev, { ...currentQuestion, completedAt: Date.now() }];
      });
    }
  }, [currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (!socket || !sessionId.trim() || !questions.length) return;
    
    // 先归档当前问题
    if (currentQuestion) {
      setQuestionHistory(prev => {
        // 检查是否已经存在相同的问题，避免重复添加
        const alreadyExists = prev.some(item => item.id === currentQuestion.id);
        if (alreadyExists) {
          console.log('Question already in history, skipping:', currentQuestion.id);
          return prev;
        }
        console.log('Question archived to history via Next button:', currentQuestion.id);
        return [...prev, { ...currentQuestion, completedAt: Date.now() }];
      });
    }
    
    // 清除当前问题，避免倒计时结束时重复归档
    setCurrentQuestion(null);
    
    // 查找下一个未使用的问题
    const availableQuestions = questions.filter(q => !usedQuestions.has(q.id));
    
    if (availableQuestions.length > 0) {
      const nextQ = availableQuestions[0];
      setCurrentQuestion(nextQ);
      setSelectedQuestionId(nextQ.id);
      
      // 将新问题标记为已使用
      setUsedQuestions(prev => new Set([...prev, nextQ.id]));
      
      // 发送下一题事件
      socket.emit('admin:question:set', { 
        sessionId: sessionId.trim(), 
        question: nextQ 
      });
      console.log('Advanced to next question:', nextQ.id);
    } else {
      console.log('No more questions available');
    }
  }, [socket, sessionId, questions, usedQuestions, currentQuestion]);

  // 倒计时结束处理函数
  const handleTimerEnd = useCallback(() => {
    // 只有倒计时自然结束时才归档问题，且当前问题存在
    if (currentQuestion) {
      archiveCurrentQuestion();
    }
    // Live Quiz不自动跳转，等待用户选择新问题
  }, [archiveCurrentQuestion, currentQuestion]);

  // 倒计时逻辑 - 基于服务器端时间同步
  useEffect(() => {
    if (!serverStartedAt || !serverTimeLimit) {
      setTimeRemaining(0);
      return;
    }

    // 如果暂停，不更新倒计时，保持当前值
    if (isTimerPaused) {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - serverStartedAt;
      const remaining = Math.max(0, (serverTimeLimit * 1000) - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      
      setTimeRemaining(remainingSeconds);
      
      if (remaining <= 0) {
        // 倒计时结束，归档问题并跳转到下一题
        handleTimerEnd();
      }
    };

    // 立即更新一次
    updateTimer();
    
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [serverStartedAt, serverTimeLimit, isTimerPaused, handleTimerEnd]);

  // 重新连接（无需认证）
  const handleReconnect = () => {
    socketManager.connect();
  };

  // 连接Socket并自动启动session
  useEffect(() => {
    // 优先使用URL中的sessionId，否则从localStorage加载
    if (urlSessionId) {
      setSessionId(urlSessionId);
      // 从localStorage加载其他配置
      const sessionConfig = localStorage.getItem('sessionConfig');
      if (sessionConfig) {
        try {
          const config = JSON.parse(sessionConfig);
          setSessionOptions(config.sessionOptions || { autoAdvance: true, defaultTimeLimit: 15 });
          setQuestions(config.selectedQuestions || []);
          console.log('Loaded session config for Live Quiz:', config);
        } catch (error) {
          console.error('Failed to parse session config:', error);
        }
      }
    } else {
      // 从localStorage加载session配置
      const sessionConfig = localStorage.getItem('sessionConfig');
      if (!sessionConfig) {
        console.error('No session config found, redirecting to setup');
        window.location.href = '/';
        return;
      }

      let config;
      try {
        config = JSON.parse(sessionConfig);
        setSessionId(config.sessionId || '');
        setSessionOptions(config.sessionOptions || { autoAdvance: true, defaultTimeLimit: 15 });
        setQuestions(config.selectedQuestions || []);
        console.log('Loaded session config for Live Quiz:', config);
      } catch (error) {
        console.error('Failed to parse session config:', error);
        window.location.href = '/';
        return;
      }
    }

    // 检查是否已经连接
    if (socketManager.isConnected()) {
      setIsConnected(true);
      console.log('✅ Host already connected, setting up event listeners');
      
      // 设置事件监听器，即使已经连接
      const socket = socketManager.getSocket();
      if (socket) {
        const handleConnect = () => {
          console.log('🔌 Host handleConnect called (already connected)');
          setIsConnected(true);
        };
        const handleDisconnect = () => setIsConnected(false);
        
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        
        // 标记需要启动session，等startSession定义后再调用
      }
      return;
    }

    // 从localStorage获取保存的token，如果没有则提示输入
    // 管理员认证已移除，直接连接
    socketManager.connect();
    
    // 监听连接状态变化
    const socket = socketManager.getSocket();
    const handleConnect = () => {
      console.log('🔌 Host handleConnect called, sessionStartedRef.current:', sessionStartedRef.current);
      setIsConnected(true);
      // 连接后自动启动session
      setTimeout(() => {
        console.log('🚀 Host calling startSession from handleConnect');
        startSession();
      }, 1000);
    };
    const handleDisconnect = () => setIsConnected(false);
    
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
    }
    
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Socket事件监听
  useEffect(() => {
    if (!socket) return;

    const handleStateSync = (data: any) => {
      console.log('📥 Host received state:sync:', data);
      if (data.question) {
        setCurrentQuestion(data.question);
      }
      // 更新服务器端时间信息
      if (data.startedAt) {
        setServerStartedAt(data.startedAt);
      }
      if (data.timeLimit) {
        setServerTimeLimit(data.timeLimit);
      }
      // 更新排行榜数据
      if (data.scoreboard) {
        console.log('📊 Host received scoreboard in state:sync:', data.scoreboard);
        setLeaderboard(data.scoreboard);
      }
    };

    const handleTimerPaused = () => {
      setIsTimerPaused(true);
      // 暂停时不更新倒计时值，保留当前显示
    };

    const handleTimerResumed = (data: { sessionId: string; startedAt: number }) => {
      // 从服务器恢复时刻继续
      setIsTimerPaused(false);
      setServerStartedAt(data.startedAt);
    };

    const handleQuestionUpdate = (data: any) => {
      console.log('📥 Host received question:update:', data);
      console.log('📥 Question update data:', {
        question: data.question?.text,
        startedAt: data.startedAt,
        timeLimit: data.timeLimit,
        startedAtTime: data.startedAt ? new Date(data.startedAt).toLocaleTimeString() : 'None'
      });
      setCurrentQuestion(data.question);
      // 更新服务器端时间信息
      if (data.startedAt) {
        console.log('🕐 Setting serverStartedAt:', data.startedAt, 'Time:', new Date(data.startedAt).toLocaleTimeString());
        setServerStartedAt(data.startedAt);
      }
      if (data.timeLimit) {
        console.log('⏱️ Setting serverTimeLimit:', data.timeLimit);
        setServerTimeLimit(data.timeLimit);
      }
    };

    const handleParticipantsUpdate = (data: { count: number; items?: Array<{ userId: string; name: string }> }) => {
      console.log('👥 Host received participants:update:', data);
      if (data.items) {
        setParticipants(data.items);
      }
    };

    const handleLeaderboardUpdate = (data: { items: Array<{ userId: string; name: string; score: number }> }) => {
      console.log('📊 Host received leaderboard:update:', data);
      console.log('📊 Leaderboard items:', data.items);
      console.log('📊 Filtered participants (excluding host):', data.items.filter(item => item.userId !== 'host'));
      setLeaderboard(data.items);
    };

    socket.on('state:sync', handleStateSync);
    socket.on('question:update', handleQuestionUpdate);
    socket.on('timer:paused', handleTimerPaused);
    socket.on('timer:resumed', handleTimerResumed);
    socket.on('participants:update', handleParticipantsUpdate);
    socket.on('leaderboard:update', handleLeaderboardUpdate);

    return () => {
      socket.off('state:sync', handleStateSync);
      socket.off('question:update', handleQuestionUpdate);
      socket.off('timer:paused', handleTimerPaused);
      socket.off('timer:resumed', handleTimerResumed);
      socket.off('participants:update', handleParticipantsUpdate);
      socket.off('leaderboard:update', handleLeaderboardUpdate);
    };
  }, [socket]);

  // 启动session
  const startSession = useCallback(() => {
    console.log('🚀 startSession called, sessionStartedRef.current:', sessionStartedRef.current, 'socket:', !!socket, 'sessionId:', sessionId.trim());
    if (!socket || !sessionId.trim() || sessionStartedRef.current) {
      console.log('🚀 startSession early return:', { socket: !!socket, sessionId: sessionId.trim(), sessionStarted: sessionStartedRef.current });
      return;
    }

    console.log('🚀 Host starting session:', sessionId.trim());
    console.log('📤 Session data:', {
      sessionId: sessionId.trim(),
      optionsCount: Object.keys(sessionOptions).length,
      questionsCount: questions.length,
      quizType: 'live'
    });
    
    sessionStartedRef.current = true;
    socket.emit('admin:session:start', {
      sessionId: sessionId.trim(),
      options: sessionOptions,
      questions: questions,
      quizType: 'live'
    });
    
    console.log('📤 admin:session:start event sent');
    
    // 延迟一下确保session创建完成后再加入房间
    setTimeout(() => {
      console.log('🚀 Host joining room:', sessionId.trim());
      // Host端也加入session房间以接收广播事件
      socket.emit('room:join', { 
        sessionId: sessionId.trim(), 
        userId: 'host', 
        name: 'Host' 
      });
    }, 100);
    
    // Live Quiz需要用户手动选择问题，不自动设置
    
    console.log('Live Quiz session started:', sessionId.trim());
  }, [socket, sessionId, sessionOptions, questions]);

  // 当连接状态变化时，尝试启动session
  useEffect(() => {
    if (isConnected && sessionId.trim() && questions.length > 0) {
      console.log('🔄 Connection established, attempting to start session');
      setTimeout(() => {
        startSession();
      }, 1000);
    }
  }, [isConnected, sessionId, questions.length, startSession]);

  const pauseTimer = useCallback(() => {
    if (!socket || !sessionId.trim()) return;
    setIsTimerPaused(true);
    socket.emit('admin:timer:pause', { sessionId: sessionId.trim() });
  }, [socket, sessionId]);

  const resumeTimer = useCallback(() => {
    if (!socket || !sessionId.trim()) return;
    setIsTimerPaused(false);
    socket.emit('admin:timer:resume', { sessionId: sessionId.trim() });
  }, [socket, sessionId]);



  const setQuestion = useCallback(() => {
    if (!socket || !sessionId.trim() || !selectedQuestionId) return;
    const question = questions.find(q => q.id === selectedQuestionId);
    if (question) {
      socket.emit('admin:question:set', { 
        sessionId: sessionId.trim(), 
        question: question 
      });
      // 立即更新本地状态，显示选择的题目
      setCurrentQuestion(question);
      // 将问题标记为已使用
      setUsedQuestions(prev => new Set([...prev, question.id]));
      // 清空选择的问题ID
      setSelectedQuestionId('');
      // 重置暂停状态，但保持服务器端时间同步
      setIsTimerPaused(false);
      console.log('Question set and marked as used:', question.id);
    }
  }, [socket, sessionId, selectedQuestionId, questions]);

  const endSession = useCallback(() => {
    if (!socket || !sessionId.trim()) return;
    if (confirm('Are you sure you want to end the session?')) {
      socket.emit('admin:session:end', { sessionId: sessionId.trim() });
      setCurrentQuestion(null);
      localStorage.removeItem('sessionConfig');
      window.location.href = '/';
      console.log('Live Quiz session ended:', sessionId.trim());
    }
  }, [socket, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Quiz Control Panel</h1>
              <p className="text-sm text-gray-600">
                Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Participants: {participants.length}
              </div>
              <button
                onClick={endSession}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Session Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Session Info</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  {!isConnected && (
                    <button
                      onClick={handleReconnect}
                      className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                    >
                      Reconnect
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session ID
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm">
                    {sessionId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm">
                    {sessionOptions.defaultTimeLimit}s
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Questions
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm">
                    {questions.length} questions loaded
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-center text-gray-500 text-sm">
                    Session will start automatically
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Participants</h3>
                <span className="text-sm text-gray-500">Total: {participants.length}</span>
              </div>

              {participants.length === 0 ? (
                <div className="text-center text-gray-500 py-6 text-sm">
                  No participants joined yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {participants.map(participant => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-100"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">{participant.name || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500">ID: {participant.userId.slice(0, 8)}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Question Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Question Selection</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Question
                    {timeRemaining > 0 && (
                      <span className="text-orange-600 text-xs ml-2">
                        (Wait for timer to finish)
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedQuestionId}
                    onMouseDown={() => setUserHasInteracted(true)}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 只有在用户已经与下拉框交互过且选择了有效选项时才更新
                      if (userHasInteracted && value && value !== '') {
                        setSelectedQuestionId(value);
                      }
                    }}
                    disabled={timeRemaining > 0}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      timeRemaining > 0 
                        ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="">
                      {timeRemaining > 0 ? 'Timer is running...' : 'Choose a question...'}
                    </option>
                    {questions
                      .filter(question => !usedQuestions.has(question.id))
                      .map((question, index) => (
                        <option key={`${question.id}-${index}`} value={question.id}>
                          Q{question.index}: {question.text.substring(0, 50)}...
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  onClick={setQuestion}
                  disabled={!selectedQuestionId || timeRemaining > 0}
                  className={`w-full py-2 px-4 rounded-md ${
                    !selectedQuestionId || timeRemaining > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {timeRemaining > 0 ? 'Timer Running...' : 'Set Question'}
                </button>

                {questions.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {questions.filter(q => !usedQuestions.has(q.id)).length} / {questions.length} questions available
                  </div>
                )}

                {/* Question History */}
                {questionHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Question History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {questionHistory.map((question, index) => (
                        <div key={`${question.id}-history-${index}`} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <div className="font-medium text-green-800">
                            Q{question.index}: {question.text.substring(0, 40)}...
                          </div>
                          <div className="text-green-600 mt-1">
                            Completed: {new Date(question.completedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Panel - Current Question & Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Current Question</h3>
              
              {currentQuestion ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Q{currentQuestion.index}: {currentQuestion.text}
                    </h4>
                    <div className="text-sm text-gray-600 mb-2">
                      Time Limit: {serverTimeLimit}s
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      ⏰ {timeRemaining}s
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Debug: Started: {serverStartedAt ? new Date(serverStartedAt).toLocaleTimeString() : 'None'}, 
                      Limit: {serverTimeLimit}s, 
                      Paused: {isTimerPaused ? 'Yes' : 'No'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={pauseTimer}
                      disabled={isTimerPaused}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      ⏸️ Pause
                    </button>
                    <button
                      onClick={resumeTimer}
                      disabled={!isTimerPaused}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      ▶️ Resume
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={nextQuestion}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      ⏭️ Next Question
                    </button>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      Skip current question and move to next
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No question selected
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Live Leaderboard</h3>
              
              {(() => {
                // 过滤掉Host，只显示参与者
                const participantLeaderboard = leaderboard.filter(item => item.userId !== 'host');
                
                console.log('🎯 Live Leaderboard Debug:', {
                  totalLeaderboard: leaderboard,
                  participantLeaderboard,
                  leaderboardLength: leaderboard.length,
                  participantLength: participantLeaderboard.length
                });
                
                if (participantLeaderboard.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-4">
                      <div>No participants yet</div>
                      <div className="text-xs mt-2">
                        Total leaderboard items: {leaderboard.length}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500 mb-2">
                      Total Participants: {participantLeaderboard.length}
                    </div>
                    {participantLeaderboard.slice(0, 10).map((item, index) => (
                      <div key={item.userId} className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">ID: {item.userId.substring(0, 8)}...</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary-600">{item.score}</div>
                            <div className="text-xs text-gray-500">points</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {participantLeaderboard.length > 10 && (
                      <div className="text-center text-xs text-gray-500 pt-2">
                        ... and {participantLeaderboard.length - 10} more participants
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};