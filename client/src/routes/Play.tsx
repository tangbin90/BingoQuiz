import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
// import { socketManager } from '../realtime/socket';
import { useQuizLive } from '../realtime/useQuizLive';
import { QuestionCard } from '../components/QuestionCard';
import { Timer } from '../components/Timer';

export const Play: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = (searchParams.get('sessionId') || '').trim();
  const storageKey = sessionId ? `play-session-${sessionId}` : null;
  const [joinError, setJoinError] = useState<string>('');

  const readStoredSessionData = () => {
    if (typeof window === 'undefined' || !storageKey) return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse stored session data:', error);
      return null;
    }
  };

  const storedData = readStoredSessionData();
  const [name, setName] = useState<string>(() => searchParams.get('name') || storedData?.name || '');
  const generateUserId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const [userId, setUserId] = useState<string>(() => storedData?.userId || generateUserId());
  const [isJoined, setIsJoined] = useState<boolean>(() => storedData?.isJoined ?? false);
  const [sessionInfo, setSessionInfo] = useState<{ quizType?: 'static' | 'live'; exists: boolean } | null>(null);
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([]);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!storageKey) {
      setName('');
      setIsJoined(false);
      hasJoinedRef.current = false;
      return;
    }

    const saved = readStoredSessionData();
    if (saved) {
      if (saved.userId && saved.userId !== userId) {
        setUserId(saved.userId);
      }
      if (saved.name && saved.name !== name) {
        setName(saved.name);
      }
      setIsJoined(!!saved.isJoined);
    } else {
      setName(prev => prev);
      setIsJoined(false);
      setUserId(prev => prev || generateUserId());
    }
    hasJoinedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  console.log('🔍 Play component rendering:', {
    sessionId,
    searchParams: Object.fromEntries(searchParams),
    rawSessionId: searchParams.get('sessionId'),
    trimmedSessionId: sessionId,
    sessionIdLength: sessionId.length,
    userId
  });

  let quizLiveResult;
  try {
    quizLiveResult = useQuizLive(userId, sessionId);
    console.log('🔍 useQuizLive result:', quizLiveResult);
  } catch (error) {
    console.error('❌ Error in useQuizLive:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Hook Error</h1>
          <p className="text-gray-600">Error in useQuizLive hook: {(error as any)?.message || String(error)}</p>
          <pre className="mt-4 text-xs text-left bg-gray-100 p-2 rounded">
            {(error as any)?.stack || 'No stack trace available'}
          </pre>
        </div>
      </div>
    );
  }

  const {
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
    isConnected
  } = quizLiveResult;

  // Detect if this is a Static Quiz based on session type
  const isStaticQuiz = state.quizType === 'static';
  const isLiveQuiz = state.quizType === 'live';
  const quizTypeDetermined = state.quizType !== undefined;
  
  // Debug: Log quiz type detection
  console.log('🎯 Quiz type detection:', {
    quizType: state.quizType,
    isStaticQuiz,
    isLiveQuiz,
    quizTypeDetermined
  });

  // 处理参与者更新
  useEffect(() => {
    if (!isConnected) return;

    const socket = (window as any).socketManager?.getSocket();
    if (!socket) return;

    const handleParticipantsUpdate = (data: { count: number; items?: Array<{ userId: string; name: string }> }) => {
      console.log('👥 Play received participants:update:', data);
      if (data.items) {
        setParticipants(data.items);
      }
    };

    socket.on('participants:update', handleParticipantsUpdate);

    return () => {
      socket.off('participants:update', handleParticipantsUpdate);
    };
  }, [isConnected]);

  // Update session info when state changes
  useEffect(() => {
    if (state.quizType) {
      setSessionInfo({
        quizType: state.quizType,
        exists: true
      });
    }
  }, [state.quizType]);

  const handleJoin = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedSessionId = sessionId.trim();
    if (!trimmedSessionId) {
      setJoinError('Missing session ID. Please provide a valid session.');
      return;
    }
    if (!trimmedName) {
      setJoinError('Please enter your name before joining.');
      return;
    }

    setJoinError('');
    joinRoom(trimmedName);
    setIsJoined(true);

    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify({
        sessionId: trimmedSessionId,
        name: trimmedName,
        userId,
        isJoined: true
      }));
    }

    setSearchParams({ sessionId: trimmedSessionId, name: trimmedName });
  }, [name, sessionId, joinRoom, storageKey, userId, setSearchParams]);

  const handleChoiceSelect = useCallback((choice: string) => {
    setSelectedChoice(choice);
  }, [setSelectedChoice]);

  const handleSubmit = useCallback((choice: string) => {
    submitAnswer(choice);
  }, [submitAnswer]);

  const handleReset = useCallback(() => {
    setSelectedChoice('');
  }, [setSelectedChoice]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    if (!isJoined) return;

    window.localStorage.setItem(storageKey, JSON.stringify({
      sessionId,
      name: name.trim(),
      userId,
      isJoined: true
    }));
  }, [storageKey, sessionId, name, userId, isJoined]);

  useEffect(() => {
    if (!sessionId || !isJoined || !name.trim()) return;
    const currentName = searchParams.get('name') || '';
    if (currentName !== name.trim()) {
      setSearchParams({ sessionId, name: name.trim() });
    }
  }, [sessionId, isJoined, name, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isJoined) {
      hasJoinedRef.current = false;
      return;
    }

    if (!sessionId || !name.trim() || !isConnected) return;
    if (hasJoinedRef.current) return;

    joinRoom(name.trim());
    hasJoinedRef.current = true;
  }, [isJoined, sessionId, name, isConnected, joinRoom]);

  const [sessionExists, setSessionExists] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      if (!sessionId) {
        setSessionExists(null);
        return;
      }

      try {
        console.log('🔍 Checking session:', sessionId, 'URL:', `/api/session/${sessionId}`);
        const response = await fetch(`/api/session/${sessionId}`);
        console.log('📡 Session check response:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
        
        if (!isMounted) return;
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Session verified:', data);
          setSessionExists(true);
        } else {
          const errorText = await response.text();
          console.log('❌ Session not found:', response.status, errorText);
          setSessionExists(false);
        }
      } catch (error) {
        console.error('Failed to verify session:', error);
        if (isMounted) setSessionExists(false);
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (sessionExists === false && !isJoined) {
      setJoinError(prev => prev || 'Session not found. Please check the session ID.');
    } else if (sessionExists === true && joinError === 'Session not found. Please check the session ID.') {
      setJoinError('');
    }
  }, [sessionExists, isJoined, joinError]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
          <p className="text-gray-600">{joinError || 'Session ID not provided.'}</p>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Quiz Session</h1>
            <p className="text-gray-600">Session ID: {sessionId}</p>
            {sessionExists === false && (
              <p className="mt-2 text-sm text-red-600">Session not found on server.</p>
            )}
            {sessionExists === null && (
              <p className="mt-2 text-sm text-gray-500">Checking session...</p>
            )}
            {sessionInfo && (
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  sessionInfo.quizType === 'static' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sessionInfo.quizType === 'static' ? '📚 Static Quiz' : '⚡ Live Quiz'}
                </span>
              </div>
            )}
          </div>
          
          {joinError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {joinError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !isConnected}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="text-2xl">
                  {isStaticQuiz ? '📚' : '🎯'}
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isStaticQuiz ? 'Static Quiz' : 'Live Quiz'}
                </h1>
              </div>
              <p className="text-sm text-gray-600">Session: {sessionId}</p>
              {name && (
                <p className="text-xs text-gray-500">Player: {name}</p>
              )}
              {participants.length > 0 && (
                <p className="text-xs text-gray-500">
                  Participants: {participants.length} ({participants.map(p => p.name).join(', ')})
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isStaticQuiz && totalQuestions > 0 && (
                <div className="text-sm text-gray-600">
                  Progress: <span className="font-bold text-primary-600">{answeredQuestions}/{totalQuestions}</span>
                </div>
              )}
              <div className="text-sm text-gray-600">
                Score: <span className="font-bold text-primary-600">{userScore}</span>
              </div>
              <Timer timeRemaining={timeRemaining} paused={state.timerPaused} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div>
            {state.status === 'waiting' && !quizTypeDetermined && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Detecting Quiz Type...</h2>
                <p className="text-gray-600">Please wait while we determine the quiz type...</p>
              </div>
            )}

            {state.status === 'waiting' && quizTypeDetermined && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Waiting for Quiz to Start</h2>
                <p className="text-gray-600">The host will start the quiz shortly...</p>
              </div>
            )}

            {state.status === 'ended' && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Quiz Ended</h2>
                <p className="text-gray-600">Thank you for participating!</p>
                <div className="mt-4 text-lg">
                  Final Score: <span className="font-bold text-primary-600">{userScore}</span>
                </div>
              </div>
            )}

            {/* Debug Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4 text-sm">
              <div><strong>Debug Info:</strong></div>
              <div>Status: {state.status}</div>
              <div>Has Question: {state.question ? 'Yes' : 'No'}</div>
              <div>Question ID: {state.question?.id || 'None'}</div>
              <div>Question Text: {state.question?.text || 'None'}</div>
              <div>Time Remaining: {timeRemaining}s</div>
              <div>Is Connected: {isConnected ? 'Yes' : 'No'}</div>
            </div>

            {state.status === 'running' && state.question && (
              <div>
                <QuestionCard
                  question={state.question}
                  shuffledOptions={shuffledOptions}
                  selectedChoice={selectedChoice}
                  isSubmitted={isSubmitted}
                  isRevealed={isRevealed}
                  onChoiceSelect={handleChoiceSelect}
                  onSubmit={handleSubmit}
                  onReset={handleReset}
                  isStaticQuiz={isStaticQuiz}
                  timeRemaining={timeRemaining}
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={totalQuestions}
                />

                {/* Feedback */}
                {feedback && (
                  <div className={`bg-white rounded-lg shadow-md p-4 mb-6 ${
                    feedback.correct ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50'
                  }`}>
                    <div className={`flex items-center justify-between ${
                      feedback.correct ? 'text-success-700' : 'text-danger-700'
                    }`}>
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">
                          {feedback.correct ? '✅' : '❌'}
                        </span>
                        <span className="font-medium">{feedback.message}</span>
                      </div>
                      {isStaticQuiz && feedbackCountdown > 0 && (
                        <div className="text-sm font-medium">
                          Next question in {feedbackCountdown}s...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {state.answersLocked && (
                  <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center text-warning-700">
                      <span className="text-xl mr-3">🔒</span>
                      <span className="font-medium">Answers are locked</span>
                    </div>
                  </div>
                )}

                {state.timerPaused && (
                  <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center text-warning-700">
                      <span className="text-xl mr-3">⏸️</span>
                      <span className="font-medium">Timer is paused</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
