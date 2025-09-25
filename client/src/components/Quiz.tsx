import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
}

interface Question {
  id: number;
  question: string;
  choices: string[];
  answer: string;
}

interface QuizProps {
  user: User;
  onExitQuiz: () => void;
  onLogout: () => void;
}

const Quiz: React.FC<QuizProps> = ({ user, onExitQuiz, onLogout }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    message: string;
  } | null>(null);
  const [score, setScore] = useState({ total: 0, correct: 0, percentage: 0, message: '' });
  const [loading, setLoading] = useState(true);
  const [autoNextTimer, setAutoNextTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 });

  useEffect(() => {
    loadQuestions();
  }, []);

  // 当题目加载完成后，初始化分数
  useEffect(() => {
    if (questions.length > 0) {
      setScore({
        total: questions.length,
        correct: 0,
        percentage: 0,
        message: ''
      });
    }
  }, [questions]);

  useEffect(() => {
    if (questions.length > 0 && !isAnswered) {
      setTimeLeft(30);
      setSelectedAnswer('');
      setFeedback(null);
    }
  }, [currentQuestionIndex, questions]);

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeUp();
    }
  }, [timeLeft, isAnswered]);

  const loadQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/questions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('加载题目失败:', error);
      setLoading(false);
    }
  };


  const handleTimeUp = () => {
    if (!isAnswered && questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = false;
      const timeSpent = 30 - timeLeft;
      
      setFeedback({
        isCorrect,
        correctAnswer: currentQuestion.answer,
        message: 'Time\'s up! This question is marked as incorrect.'
      });
      
      setIsAnswered(true);
      submitAnswer(currentQuestion.id, '', timeSpent, isCorrect);
      
      // 开始倒计时
      setCountdown(3);
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownInterval);
          handleNext();
        }
      }, 1000);
      
      setAutoNextTimer(countdownInterval as any);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!isAnswered) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer && !isAnswered) {
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = selectedAnswer === currentQuestion.answer;
      const timeSpent = 30 - timeLeft;
      
      setFeedback({
        isCorrect,
        correctAnswer: currentQuestion.answer,
        message: isCorrect ? 'Correct!' : 'Incorrect!'
      });
      
      setIsAnswered(true);
      submitAnswer(currentQuestion.id, selectedAnswer, timeSpent, isCorrect);
      
      // 开始倒计时
      setCountdown(3);
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownInterval);
          handleNext();
        }
      }, 1000);
      
      setAutoNextTimer(countdownInterval as any);
    }
  };


  const submitAnswer = async (questionId: number, answer: string, timeSpent: number, isCorrect: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/submit-answer', {
        questionId,
        answer,
        timeSpent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 更新本地分数
      setScore(prev => {
        const newCorrect = isCorrect ? prev.correct + 1 : prev.correct;
        const newPercentage = Math.round((newCorrect / prev.total) * 100);
        return {
          total: prev.total,
          correct: newCorrect,
          percentage: newPercentage,
          message: ''
        };
      });
    } catch (error) {
      console.error('提交答案失败:', error);
    }
  };

  const handleNext = () => {
    // 清除自动计时器
    if (autoNextTimer) {
      clearInterval(autoNextTimer);
      setAutoNextTimer(null);
    }
    
    setCountdown(0);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsAnswered(false);
      setFeedback(null);
      setSelectedAnswer('');
    } else {
      // 所有题目完成 - 显示总结并保存到数据库
      setFinalScore({
        correct: score.correct,
        total: score.total,
        percentage: score.percentage
      });
      setQuizCompleted(true);
      saveQuizResult();
    }
  };

  const handleReset = () => {
    // 清除自动计时器
    if (autoNextTimer) {
      clearInterval(autoNextTimer);
      setAutoNextTimer(null);
    }
    
    setCountdown(0);
    setSelectedAnswer('');
    setFeedback(null);
    setIsAnswered(false);
    setTimeLeft(30);
  };

  const saveQuizResult = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Saving quiz result:', {
        userId: user.id,
        correctAnswers: finalScore.correct,
        totalQuestions: finalScore.total,
        percentage: finalScore.percentage,
        completedAt: new Date().toISOString()
      });
      
      const response = await axios.post('http://localhost:5000/api/quiz-result', {
        userId: user.id,
        correctAnswers: finalScore.correct,
        totalQuestions: finalScore.total,
        percentage: finalScore.percentage,
        completedAt: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Quiz result saved successfully:', response.data);
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  const handleExit = () => {
    onExitQuiz();
  };

  const handleRestartQuiz = () => {
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setFeedback(null);
    setSelectedAnswer('');
    setScore({ total: questions.length, correct: 0, percentage: 0, message: '' });
    setFinalScore({ correct: 0, total: 0, percentage: 0 });
    loadQuestions();
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="text-center">没有可用的题目</div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="quiz-container">
        {/* Logo Banner */}
        <div className="logo-banner">
          <div className="logo">algo<span>ed</span></div>
        </div>

        {/* Quiz Summary */}
        <div className="quiz-summary">
          <h2>Quiz Completed!</h2>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Questions:</span>
              <span className="stat-value">{finalScore.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Correct Answers:</span>
              <span className="stat-value correct">{finalScore.correct}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Incorrect Answers:</span>
              <span className="stat-value incorrect">{finalScore.total - finalScore.correct}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accuracy:</span>
              <span className="stat-value percentage">{finalScore.percentage}%</span>
            </div>
          </div>
          
          <div className="summary-actions">
            <button className="btn" onClick={handleRestartQuiz}>
              Take Quiz Again
            </button>
            <button className="btn btn-secondary" onClick={handleExit}>
              Exit Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="quiz-container">
      {/* Logo Banner */}
      <div className="logo-banner">
        <div className="logo">algo<span>ed</span></div>
      </div>

      {/* Top Navigation Bar */}
      <header className="quiz-header">
        <h1>Dartmouth Philosophy Society Quiz Competition</h1>
        <div className="status-bar">
          <div className="score">Current Score: <strong>{score.correct}/{score.total}</strong></div>
          <div className="timer">⏱ {formatTime(timeLeft)}</div>
          <button className="exit-btn" onClick={handleExit}>Exit Quiz</button>
        </div>
      </header>

      {/* Main Quiz Content */}
      <main className="quiz-main">
        <div className="question-info">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        
        <h2 className="question-text">
          {currentQuestion.question}
        </h2>
        
        <div className="options">
          {currentQuestion.choices.map((choice, index) => {
            let className = 'option';
            if (selectedAnswer === choice) {
              className += ' selected';
            }
            if (isAnswered) {
              if (choice === currentQuestion.answer) {
                className += ' correct';
              } else if (selectedAnswer === choice && choice !== currentQuestion.answer) {
                className += ' incorrect';
              }
            }
            
            return (
              <label 
                key={index} 
                className={className}
              >
                <input 
                  type="radio" 
                  name="question" 
                  value={choice}
                  checked={selectedAnswer === choice}
                  onChange={() => handleAnswerSelect(choice)}
                  disabled={isAnswered}
                />
                {choice}
              </label>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="quiz-footer">
        <button 
          className="reset-btn" 
          onClick={handleReset}
          disabled={isAnswered}
        >
          Reset response
        </button>
        <button 
          className="next-btn" 
          onClick={handleSubmit}
          disabled={!selectedAnswer || isAnswered}
        >
          Save & Next →
        </button>
      </footer>

      {/* Feedback */}
      {feedback && (
        <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          {feedback.message}
          {!feedback.isCorrect && (
            <div>Correct answer is: {feedback.correctAnswer}</div>
          )}
          {countdown > 0 && (
            <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
              Auto next in {countdown} seconds...
            </div>
          )}
        </div>
      )}

      {/* Final Score */}
      {score.message && (
        <div className="score-display">
          {score.message}
        </div>
      )}
    </div>
  );
};

export default Quiz;