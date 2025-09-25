# Bingo Quiz - 在线答题应用

一个基于React、Node.js和MySQL的现代化在线答题应用，具有用户登录、实时答题、倒计时和分数统计功能。

## 功能特性

- 🔐 用户注册和登录系统
- 📚 从JSON文件导入题目到MySQL数据库
- ⏰ 每道题30秒倒计时
- 🎯 实时显示答题反馈
- 📊 实时更新分数统计
- 🎓 首次登录使用指引
- 📱 响应式设计，支持移动端

## 技术栈

- **前端**: React 18 + TypeScript
- **后端**: Node.js + Express
- **数据库**: MySQL
- **样式**: CSS3 + 渐变设计
- **路由**: React Router

## 安装和运行

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 数据库设置

1. 确保MariaDB服务正在运行
2. 创建数据库并导入表结构：

```bash
# 使用密码 binbingo
mysql -u root -pbinbingo < server/database.sql
```

3. 导入题目数据：

```bash
node server/import-data.js
```

4. 测试数据库连接：

```bash
node test-database.js
```

### 3. 环境配置

创建 `.env` 文件在项目根目录：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=binbingo
DB_NAME=bingo_quiz
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
```

### 4. 启动应用

```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run server  # 启动后端 (端口 5000)
npm run client  # 启动前端 (端口 3000)
```

## 项目结构

```
BingoQuiz/
├── client/                 # React前端应用
│   ├── public/
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── Login.tsx   # 登录组件
│   │   │   ├── Quiz.tsx    # 答题组件
│   │   │   └── Tutorial.tsx # 使用指引组件
│   │   ├── App.tsx         # 主应用组件
│   │   └── index.tsx       # 入口文件
│   └── package.json
├── server/                 # Node.js后端
│   ├── index.js           # 服务器主文件
│   ├── database.sql       # 数据库结构
│   └── import-data.js     # 数据导入脚本
├── Example/               # 示例数据
│   ├── Data.json          # 题目数据
│   └── sample.png         # 设计参考图
└── package.json
```

## API接口

### 用户认证
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 答题功能
- `GET /api/questions` - 获取所有题目
- `POST /api/submit-answer` - 提交答案
- `GET /api/score` - 获取用户分数
- `GET /api/first-time` - 检查是否首次登录

## 使用说明

1. **注册/登录**: 首次使用需要注册账号
2. **使用指引**: 首次登录会显示使用说明
3. **开始答题**: 每道题有30秒倒计时
4. **查看反馈**: 答题后立即显示正确/错误反馈
5. **查看分数**: 页面顶部实时显示当前分数

## 数据库表结构

### users - 用户表
- `id`: 用户ID
- `username`: 用户名
- `password`: 加密密码
- `created_at`: 创建时间

### questions - 题目表
- `id`: 题目ID
- `question`: 题目内容
- `choices`: 选项(JSON格式)
- `answer`: 正确答案
- `created_at`: 创建时间

### user_answers - 答题记录表
- `id`: 记录ID
- `user_id`: 用户ID
- `question_id`: 题目ID
- `user_answer`: 用户答案
- `is_correct`: 是否正确
- `time_spent`: 答题用时(秒)
- `created_at`: 答题时间

## 开发说明

- 前端使用React 18 + TypeScript开发
- 后端使用Express + MySQL2
- 使用JWT进行身份验证
- 密码使用bcryptjs加密
- 支持CORS跨域请求
- 响应式设计，适配各种设备

## 许可证

MIT License
