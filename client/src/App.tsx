import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Quiz from './components/Quiz';
import Tutorial from './components/Tutorial';
import QuizHistory from './components/QuizHistory';
import './App.css';

interface User {
  id: number;
  username: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'tutorial' | 'quiz' | 'history'>('tutorial');

  useEffect(() => {
    // 检查本地存储的用户信息
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      checkFirstTime(JSON.parse(userData).id);
    } else {
      setLoading(false);
    }
  }, []);

  const checkFirstTime = async (userId: number) => {
    try {
      const response = await fetch('/api/first-time', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFirstTime(data.isFirstTime);
      }
    } catch (error) {
      console.error('检查首次登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    checkFirstTime(userData.id);
  };

  const handleLogout = () => {
    setUser(null);
    setIsFirstTime(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleTutorialComplete = () => {
    setIsFirstTime(false);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card text-center">
          <h2>加载中...</h2>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    setCurrentPage('quiz');
  };

  const handleShowHistory = () => {
    setCurrentPage('history');
  };

  const renderMainContent = () => {
    if (!user) return <Navigate to="/login" replace />;
    
    if (isFirstTime) {
      return <Tutorial onComplete={handleTutorialComplete} />;
    }

    console.log('App rendering with currentPage:', currentPage, 'user:', user.username);

    switch (currentPage) {
      case 'quiz':
        return <Quiz user={user} onExitQuiz={handleShowHistory} onLogout={handleLogout} />;
      case 'history':
        return <QuizHistory user={user} onStartNewQuiz={handleStartQuiz} onLogout={handleLogout} />;
      default:
        return <QuizHistory user={user} onStartNewQuiz={handleStartQuiz} onLogout={handleLogout} />;
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/" 
            element={renderMainContent()}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
