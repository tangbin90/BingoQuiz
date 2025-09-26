import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketManager } from '../realtime/socket';
import { Question, SessionOptions } from '../types';

export const HostEntry: React.FC = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [quizType, setQuizType] = useState<'static' | 'live'>('live');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [sessionOptions, setSessionOptions] = useState<SessionOptions>({
    autoAdvance: true,
    defaultTimeLimit: 15
  });
  const [isConnected, setIsConnected] = useState(false);

  const socket = socketManager.getSocket();

  // 连接Socket
  useEffect(() => {
    if (socketManager.isConnected()) {
      setIsConnected(true);
      return;
    }

    let adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      adminToken = prompt('Enter admin token:') || 'admin_secret_token_2024';
      localStorage.setItem('adminToken', adminToken);
    }
    
    socketManager.connect(adminToken);
    
    const socket = socketManager.getSocket();
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      // 如果已经连接，立即更新状态
      if (socket.connected) {
        setIsConnected(true);
      }
    }
    
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, []);

  // 加载题库
  useEffect(() => {
    fetch('/api/questions')
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error('Failed to load questions:', err));
  }, []);

  // 文件上传处理
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uploadedQuestions = JSON.parse(e.target?.result as string);
        setQuestions(uploadedQuestions);
        setSelectedQuestions([]);
        console.log('Questions uploaded:', uploadedQuestions.length);
      } catch (error) {
        console.error('Failed to parse questions file:', error);
        alert('Invalid questions file format');
      }
    };
    reader.readAsText(file);
  }, []);

  // 题目选择切换
  const toggleQuestionSelection = useCallback((question: Question) => {
    setSelectedQuestions(prev => {
      const isSelected = prev.some(q => q.id === question.id);
      if (isSelected) {
        return prev.filter(q => q.id !== question.id);
      } else {
        return [...prev, question];
      }
    });
  }, []);

  // 启动会话并跳转
  const startSession = useCallback(() => {
    if (!sessionId.trim()) {
      alert('Please enter a session ID');
      return;
    }

    // 保存session配置到localStorage
    const sessionConfig = {
      sessionId: sessionId.trim(),
      quizType,
      sessionOptions,
      selectedQuestions: selectedQuestions.length > 0 ? selectedQuestions : questions
    };
    localStorage.setItem('sessionConfig', JSON.stringify(sessionConfig));

    // 根据quiz类型跳转到相应页面，包含sessionId
    if (quizType === 'live') {
      navigate(`/live/${sessionId.trim()}`);
    } else {
      navigate(`/static/${sessionId.trim()}`);
    }
  }, [sessionId, quizType, sessionOptions, selectedQuestions, questions, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quiz Session Setup</h1>
              <p className="text-sm text-gray-600">
                Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Questions: {questions.length}
              </div>
              <a
                href="/play"
                className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
              >
                🎯 Join Session
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Session Configuration */}
          <div className="space-y-6">
            {/* Quiz Type Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Quiz Type</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="live"
                    name="quizType"
                    value="live"
                    checked={quizType === 'live'}
                    onChange={(e) => setQuizType(e.target.value as 'static' | 'live')}
                    className="mr-3"
                  />
                  <label htmlFor="live" className="text-sm font-medium">
                    <div className="font-semibold">Live Quiz</div>
                    <div className="text-gray-600 text-xs">
                      • Full host control during session<br/>
                      • Manual question navigation<br/>
                      • Timer controls (pause/resume)<br/>
                      • Answer locking/unlocking<br/>
                      • Real-time question management
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="static"
                    name="quizType"
                    value="static"
                    checked={quizType === 'static'}
                    onChange={(e) => setQuizType(e.target.value as 'static' | 'live')}
                    className="mr-3"
                  />
                  <label htmlFor="static" className="text-sm font-medium">
                    <div className="font-semibold">Static Quiz</div>
                    <div className="text-gray-600 text-xs">
                      • Host selects questions and publishes them<br/>
                      • Set time limit for each question<br/>
                      • No question controls during session<br/>
                      • Auto-terminate when all questions are answered<br/>
                      • View participant rankings
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Session Configuration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Session Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session ID
                  </label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Enter session ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={sessionOptions.defaultTimeLimit}
                    onChange={(e) => setSessionOptions(prev => ({
                      ...prev,
                      defaultTimeLimit: parseInt(e.target.value) || 15
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {quizType === 'static' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoAdvance"
                      checked={sessionOptions.autoAdvance}
                      onChange={(e) => setSessionOptions(prev => ({
                        ...prev,
                        autoAdvance: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <label htmlFor="autoAdvance" className="text-sm text-gray-700">
                      Auto advance to next question
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={startSession}
                    disabled={!sessionId.trim() || !isConnected}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                      quizType === 'live' 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    Start {quizType === 'live' ? 'Live' : 'Static'} Quiz Session
                  </button>
                  
                  <div className="text-xs text-gray-500 text-center">
                    {selectedQuestions.length > 0 
                      ? `${selectedQuestions.length} questions selected`
                      : 'Using all questions'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Questions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
              <div className="flex space-x-2">
                <label className="px-3 py-1 rounded text-xs bg-blue-500 text-white cursor-pointer hover:bg-blue-600">
                  Upload JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={() => setSelectedQuestions([])}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((question, index) => {
                const isSelected = selectedQuestions.some(q => q.id === question.id);
                
                return (
                  <div
                    key={question.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleQuestionSelection(question)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          Q{question.index}: {question.text}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Time Limit: {question.timeLimit || sessionOptions.defaultTimeLimit}s
                        </div>
                      </div>
                      <div className="ml-3">
                        {isSelected && (
                          <div className="text-primary-600 text-xs font-medium">
                            ✓ Selected for session
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedQuestions.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                {selectedQuestions.length} questions selected for session
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
