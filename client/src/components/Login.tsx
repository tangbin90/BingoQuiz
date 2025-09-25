import React, { useState } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
}

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const response = await axios.post(endpoint, formData);
      
      if (response.data.token) {
        onLogin(response.data.user, response.data.token);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || '发生错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="login-container">
        <div className="login-form">
          <h2>{isLogin ? '登录' : '注册'}</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-control"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </button>
          </form>
          
          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              disabled={loading}
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

