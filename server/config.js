// 数据库配置
module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'binbingo',
    database: process.env.DB_NAME || 'bingo_quiz'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here'
  },
  server: {
    port: process.env.PORT || 5000
  }
};

