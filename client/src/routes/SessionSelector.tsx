import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SessionInfo {
  sessionId: string;
  status: string;
  participants: number;
  currentQuestion: number | null;
  quizType?: 'static' | 'live';
}

export const SessionSelector: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  // 获取所有可用的session
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          setError('');
        } else {
          setError('Failed to load sessions');
        }
      } catch (err) {
        setError('Error connecting to server');
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    
    // 每5秒刷新一次session列表
    const interval = setInterval(fetchSessions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleJoinSession = (sessionId: string) => {
    // 清除该会话的本地存储，强制用户重新输入用户名
    const storageKey = `play-session-${sessionId}`;
    localStorage.removeItem(storageKey);
    navigate(`/play?sessionId=${sessionId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuizTypeColor = (quizType?: string) => {
    switch (quizType) {
      case 'static':
        return 'bg-blue-100 text-blue-800';
      case 'live':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Join Quiz Session</h1>
              <p className="text-sm text-gray-600 mt-1">
                Select an active quiz session to join
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading sessions...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">❌</span>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && sessions.filter(s => s.status !== 'ended').length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Sessions</h2>
            <p className="text-gray-600">
              There are no quiz sessions currently running. Please wait for a host to create a session.
            </p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Available Sessions ({sessions.filter(s => s.status !== 'ended').length})
              </h2>
              <p className="text-sm text-gray-600">
                Click on any session to join as a participant
              </p>
            </div>

            <div className="grid gap-4">
              {sessions
                .filter(session => session.status !== 'ended')
                .map((session) => (
                <div
                  key={session.sessionId}
                  className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleJoinSession(session.sessionId)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Session: {session.sessionId}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuizTypeColor(session.quizType)}`}>
                          {session.quizType === 'static' ? '📚 Static Quiz' : '🎯 Live Quiz'}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status === 'running' ? '🔴 Live' : 
                         session.status === 'waiting' ? '🟡 Waiting' : '⚫ Ended'}
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-sm">
                        <span className="text-gray-600">Participants:</span>
                        <span className="ml-2 font-medium text-gray-900">{session.participants}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Current Question:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {session.currentQuestion ? `#${session.currentQuestion}` : 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Click to join this session
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Join Session →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Refresh the page to see newly created sessions
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
