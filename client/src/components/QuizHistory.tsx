import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface QuizResult {
  id: number;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
}

interface QuizHistoryProps {
  user: User;
  onLogout: () => void;
  onStartNewQuiz: () => void;
}

const QuizHistory: React.FC<QuizHistoryProps> = ({ user, onLogout, onStartNewQuiz }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading quiz history with token:', token ? 'present' : 'missing');
      const response = await axios.get('http://localhost:5000/api/quiz-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Quiz history response:', response.data);
      setQuizResults(response.data);
      setLoading(false);
    } catch (error) {
      console.error('加载Quiz历史失败:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getPerformanceText = (percentage: number) => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="text-center">Loading quiz history...</div>
      </div>
    );
  }

  console.log('QuizHistory rendering with:', { 
    quizResults: quizResults.length, 
    loading, 
    user: user.username 
  });

  return (
    <div className="quiz-container">
      {/* Logo Banner */}
      <div className="logo-banner">
        <div className="logo">algo<span>ed</span></div>
      </div>

      {/* Quiz History Header */}
      <div className="history-header">
        <h1>Quiz History</h1>
        <p>Welcome back, {user.username}! Here are your previous quiz results.</p>
      </div>

      {/* Quiz Results */}
      <div className="quiz-results">
        {quizResults.length === 0 ? (
          <div className="no-results">
            <h3>No Quiz Results Yet</h3>
            <p>You haven't completed any quizzes yet. Start your first quiz now!</p>
            <button className="btn" onClick={onStartNewQuiz}>
              Start Your First Quiz
            </button>
          </div>
        ) : (
          <>
            <div className="results-summary">
              <h3>Your Quiz Performance</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-number">{quizResults.length}</span>
                  <span className="stat-label">Quizzes Completed</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-number">
                    {Math.round(quizResults.reduce((sum, result) => sum + result.percentage, 0) / quizResults.length)}%
                  </span>
                  <span className="stat-label">Average Score</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-number">
                    {Math.max(...quizResults.map(result => result.percentage))}%
                  </span>
                  <span className="stat-label">Best Score</span>
                </div>
              </div>
            </div>

            <div className="results-list">
              <h3>Quiz Attempts</h3>
              {quizResults.map((result, index) => (
                <div key={result.id} className="result-item">
                  <div className="result-header">
                    <span className="quiz-number">Quiz #{quizResults.length - index}</span>
                    <span className="quiz-date">{formatDate(result.completed_at)}</span>
                  </div>
                  <div className="result-stats">
                    <div className="result-stat">
                      <span className="stat-label">Score:</span>
                      <span className="stat-value">{result.correct_answers}/{result.total_questions}</span>
                    </div>
                    <div className="result-stat">
                      <span className="stat-label">Percentage:</span>
                      <span 
                        className="stat-value percentage"
                        style={{ color: getPerformanceColor(result.percentage) }}
                      >
                        {result.percentage}%
                      </span>
                    </div>
                    <div className="result-stat">
                      <span className="stat-label">Performance:</span>
                      <span 
                        className="stat-value performance"
                        style={{ color: getPerformanceColor(result.percentage) }}
                      >
                        {getPerformanceText(result.percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="history-actions">
        <button className="btn" onClick={onStartNewQuiz}>
          Take New Quiz
        </button>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default QuizHistory;
