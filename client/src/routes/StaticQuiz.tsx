import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socketManager } from '../realtime/socket';
import { Question, SessionOptions } from '../types';

export const StaticQuiz: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>({
    autoAdvance: true,
    defaultTimeLimit: 15
  });
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; name: string; score: number }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    totalQuestions: 0,
    currentQuestion: 0,
    participantsCount: 0
  });

  const [socket, setSocket] = useState(socketManager.getSocket());
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    sessionStartedRef.current = false;
  }, [sessionId]);

  // 加载会话配置
  useEffect(() => {
    const loadConfigFromStorage = (configString: string | null) => {
      if (!configString) {
        console.error('No session config found, redirecting to setup');
        window.location.href = '/';
        return;
      }

      try {
        const config = JSON.parse(configString);
        setSessionId(config.sessionId || '');
        setSessionOptions(config.sessionOptions || { autoAdvance: true, defaultTimeLimit: 15 });
        setQuestions(config.selectedQuestions || []);
        setSessionStats(prev => ({ ...prev, totalQuestions: config.selectedQuestions?.length || 0 }));
        console.log('Loaded session config for Static Quiz:', config);
      } catch (error) {
        console.error('Failed to parse session config:', error);
        window.location.href = '/';
      }
    };

    if (urlSessionId) {
      setSessionId(urlSessionId);
      const sessionConfig = localStorage.getItem('sessionConfig');
      if (sessionConfig) {
        try {
          const config = JSON.parse(sessionConfig);
          setSessionOptions(config.sessionOptions || { autoAdvance: true, defaultTimeLimit: 15 });
          setQuestions(config.selectedQuestions || []);
          setSessionStats(prev => ({ ...prev, totalQuestions: config.selectedQuestions?.length || 0 }));
          console.log('Loaded session config for Static Quiz:', config);
        } catch (error) {
          console.error('Failed to parse session config:', error);
        }
      }
    } else {
      loadConfigFromStorage(localStorage.getItem('sessionConfig'));
    }
  }, [urlSessionId]);

  // 建立Socket连接
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let adminToken = socketManager.getAdminToken() || localStorage.getItem('adminToken');
    if (!adminToken) {
      adminToken = prompt('Enter admin token:') || 'admin_secret_token_2024';
      localStorage.setItem('adminToken', adminToken);
    }

    if (adminToken) {
      socketManager.setAdminToken(adminToken);
    }

    const activeSocket = socketManager.connect(adminToken || undefined);
    setSocket(activeSocket);

    const handleConnect = () => {
      console.log('🔌 StaticQuiz connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔌 StaticQuiz disconnected');
      setIsConnected(false);
      sessionStartedRef.current = false;
    };

    if (activeSocket) {
      activeSocket.on('connect', handleConnect);
      activeSocket.on('disconnect', handleDisconnect);

      if (activeSocket.connected) {
        handleConnect();
      }
    }

    return () => {
      if (activeSocket) {
        activeSocket.off('connect', handleConnect);
        activeSocket.off('disconnect', handleDisconnect);
      }
    };
  }, [sessionId]);

  // Socket事件监听
  useEffect(() => {
    if (!socket) return;

    const handleParticipantsUpdate = (data: { count: number; items?: Array<{ userId: string; name: string }> }) => {
      console.log('👥 Static Quiz received participants:update:', data);
      if (data.items) {
        setParticipants(data.items);
        setSessionStats(prev => ({ ...prev, participantsCount: data.items?.length || 0 }));
      }
    };

    const handleLeaderboardUpdate = (data: { items: Array<{ userId: string; name: string; score: number }> }) => {
      console.log('📊 Static Quiz received leaderboard:update:', data);
      setLeaderboard(data.items);
    };

    const handleQuestionUpdate = (data: { question: Question; startedAt: number; timeLimit: number }) => {
      console.log('📥 Static Quiz received question:update:', data);
      const questionIndex = questions.findIndex(q => q.id === data.question.id);
      setCurrentQuestionIndex(questionIndex);
      setSessionStats(prev => ({ ...prev, currentQuestion: questionIndex + 1 }));
    };

    socket.on('participants:update', handleParticipantsUpdate);
    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('question:update', handleQuestionUpdate);

    return () => {
      socket.off('participants:update', handleParticipantsUpdate);
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('question:update', handleQuestionUpdate);
    };
  }, [socket, questions]);

  // 启动session
  const startSession = useCallback(() => {
    const socketInstance = socket;
    const trimmedSessionId = sessionId.trim();

    console.log('🚀 startSession called:', {
      hasSocket: !!socketInstance,
      sessionId: trimmedSessionId,
      questionsLength: questions.length,
      alreadyStarted: sessionStartedRef.current
    });

    if (!socketInstance || !trimmedSessionId || sessionStartedRef.current) {
      console.log('❌ Cannot start session:', {
        hasSocket: !!socketInstance,
        sessionId: trimmedSessionId,
        alreadyStarted: sessionStartedRef.current
      });
      return;
    }

    if (!questions.length) {
      console.warn('❌ Cannot start session without questions');
      return;
    }

    sessionStartedRef.current = true;
    console.log('📤 Starting Static Quiz session...');
    console.log('📤 Static Quiz session data:', {
      sessionId: trimmedSessionId,
      optionsCount: Object.keys(sessionOptions).length,
      questionsCount: questions.length,
      quizType: 'static'
    });
    
    socketInstance.emit('admin:session:start', {
      sessionId: trimmedSessionId,
      options: sessionOptions,
      questions: questions,
      quizType: 'static'
    });
    
    console.log('📤 admin:session:start event sent for Static Quiz');

    socketInstance.emit('room:join', {
      sessionId: trimmedSessionId,
      userId: 'host',
      name: 'Host'
    });
    
    console.log('📤 room:join event sent for Static Quiz');
    console.log('✅ Static Quiz session started:', trimmedSessionId);
  }, [socket, sessionId, sessionOptions, questions]);

  useEffect(() => {
    if (isConnected) {
      startSession();
    }
  }, [isConnected, startSession]);

  // 结束session
  const endSession = useCallback(() => {
    const socketInstance = socket;
    if (!socketInstance || !sessionId.trim()) return;
    socketInstance.emit('admin:session:end', { sessionId: sessionId.trim() });
    sessionStartedRef.current = false;
  }, [socket, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Static Quiz Management</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Session Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Session Info</h3>
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

          </div>

          {/* Center Panel - Session Status */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Session Status</h3>
              
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <div className="text-sm text-green-800">Session Running</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">Auto</div>
                  <div className="text-sm text-blue-800">Question Control</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">{questions.length}</div>
                  <div className="text-sm text-purple-800">Total Questions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Live Leaderboard</h3>
              
              {leaderboard.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No participants yet
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((item, index) => (
                    <div key={item.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-primary-600">{item.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};