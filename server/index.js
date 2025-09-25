const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MariaDB 数据库连接
const db = mysql.createConnection(config.database);

db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
  }
});

// JWT 中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '访问令牌缺失' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 检查用户是否已存在
    const [existingUsers] = await db.promise().query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const [result] = await db.promise().query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    const token = jwt.sign(
      { userId: result.insertId, username },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      message: '注册成功', 
      token,
      user: { id: result.insertId, username }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    const user = users[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      message: '登录成功', 
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取所有题目
app.get('/api/questions', authenticateToken, async (req, res) => {
  try {
    const [questions] = await db.promise().query(
      'SELECT * FROM questions ORDER BY RAND()'
    );
    
    // 解析choices字段从JSON字符串到数组
    const processedQuestions = questions.map(question => ({
      ...question,
      choices: typeof question.choices === 'string' ? JSON.parse(question.choices) : question.choices
    }));
    
    res.json(processedQuestions);
  } catch (error) {
    console.error('获取题目错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 提交答案
app.post('/api/submit-answer', authenticateToken, async (req, res) => {
  try {
    const { questionId, answer, timeSpent } = req.body;
    const userId = req.user.userId;
    
    // 获取正确答案
    const [questions] = await db.promise().query(
      'SELECT answer FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (questions.length === 0) {
      return res.status(400).json({ message: '题目不存在' });
    }
    
    const correctAnswer = questions[0].answer;
    const isCorrect = answer === correctAnswer;
    
    // 保存答题记录
    await db.promise().query(
      'INSERT INTO user_answers (user_id, question_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?)',
      [userId, questionId, answer, isCorrect, timeSpent]
    );
    
    res.json({ 
      isCorrect, 
      correctAnswer,
      message: isCorrect ? '回答正确！' : '回答错误！'
    });
  } catch (error) {
    console.error('提交答案错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户分数
app.get('/api/score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [result] = await db.promise().query(
      'SELECT COUNT(*) as total, SUM(is_correct) as correct FROM user_answers WHERE user_id = ?',
      [userId]
    );
    
    const { total, correct } = result[0];
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    res.json({ 
      total,
      correct,
      score,
      message: `您的得分: ${correct}/${total} (${score}%)`
    });
  } catch (error) {
    console.error('获取分数错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 检查用户是否首次登录
app.get('/api/first-time', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [answers] = await db.promise().query(
      'SELECT COUNT(*) as count FROM user_answers WHERE user_id = ?',
      [userId]
    );
    
    res.json({ isFirstTime: answers[0].count === 0 });
  } catch (error) {
    console.error('检查首次登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 保存Quiz结果
app.post('/api/quiz-result', authenticateToken, async (req, res) => {
  try {
    const { userId, correctAnswers, totalQuestions, percentage, completedAt } = req.body;
    
    // 插入Quiz结果到数据库
    await db.promise().query(
      'INSERT INTO quiz_results (user_id, correct_answers, total_questions, percentage, completed_at) VALUES (?, ?, ?, ?, ?)',
      [userId, correctAnswers, totalQuestions, percentage, completedAt]
    );
    
    res.json({ message: 'Quiz result saved successfully' });
  } catch (error) {
    console.error('保存Quiz结果错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取Quiz历史记录
app.get('/api/quiz-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [results] = await db.promise().query(
      'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY completed_at DESC',
      [userId]
    );
    
    res.json(results);
  } catch (error) {
    console.error('获取Quiz历史错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
