const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// MariaDB 数据库连接
const db = mysql.createConnection(config.database);

// 读取Data.json文件
const dataPath = path.join(__dirname, '../Example/Data.json');
const questionsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function importQuestions() {
  try {
    console.log('开始导入题目数据...');
    
    // 清空现有题目
    await db.promise().query('DELETE FROM questions');
    console.log('已清空现有题目');
    
    // 导入新题目
    for (const question of questionsData) {
      await db.promise().query(
        'INSERT INTO questions (question, choices, answer) VALUES (?, ?, ?)',
        [
          question.question,
          JSON.stringify(question.choices),
          question.answer
        ]
      );
    }
    
    console.log(`成功导入 ${questionsData.length} 道题目`);
    
    // 验证导入结果
    const [result] = await db.promise().query('SELECT COUNT(*) as count FROM questions');
    console.log(`数据库中现有 ${result[0].count} 道题目`);
    
  } catch (error) {
    console.error('导入数据失败:', error);
  } finally {
    db.end();
  }
}

importQuestions();
