# 🎯 BingoQuiz Real-time Quiz System

A modern real-time quiz system based on React + Socket.IO, supporting Live Quiz and Static Quiz modes for multi-user synchronized competitive answering.

## 📋 Table of Contents
- [🌟 Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📖 User Guide](#-user-guide)
- [🛠️ Technical Architecture](#️-technical-architecture)
- [📚 Documentation](#-documentation)
- [🔧 Development Guide](#-development-guide)

## 🌟 Features

### 🎮 Core Features
- **Dual Mode Support**: Live Quiz (real-time control) and Static Quiz (automatic mode)
- **Real-time Synchronized Answering**: Multi-user participation with real-time leaderboard updates
- **Smart Anti-cheating**: Each user sees different option orders to prevent copying
- **Progress Tracking**: Static Quiz shows answering progress and total questions
- **3-second Feedback Delay**: Static Quiz shows results after 3 seconds
- **Responsive Design**: Perfect adaptation for desktop and mobile devices
- **Flexible Configuration**: Customizable time limits, question content, etc.

### 🎭 User Roles
- **Host**: Create sessions, control process, manage question bank
- **Participant**: Join sessions, real-time answering, view rankings

### 🔧 Technical Highlights
- WebSocket-based real-time communication
- Full-stack TypeScript development
- Modern React Hooks architecture
- TailwindCSS responsive design
- Vite fast build tool

## 🚀 Quick Start

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Modern browsers (Chrome, Firefox, Safari, Edge)

### Installation and Startup

```bash
# 1. Clone project
git clone <repository-url>
cd BingoQuiz

# 2. Install dependencies
npm run install-all

# 3. Start development server
npm run dev
```

### Access URLs
- **Main Entry**: http://localhost:3000 (Create and manage sessions)
- **Participant Entry**: http://localhost:3000/play (Join sessions)
- **Backend Service**: http://localhost:3001

## 📖 User Guide

### 🎭 Host Operations

#### Live Quiz Mode
1. **Access Main Entry**
   - Visit `http://localhost:3000`

2. **Create Live Quiz Session**
   ```
   Session ID: live-session
   Quiz Type: Live Quiz
   Time Limit: 15 seconds (adjustable)
   Questions: Select from question bank or use all
   ```

3. **Control Answering Process**
   - Select and set questions
   - Control timer (start/pause/resume)
   - View real-time leaderboard
   - Manually jump to next question

#### Static Quiz Mode
1. **Create Static Quiz Session**
   ```
   Session ID: static-session
   Quiz Type: Static Quiz
   Time Limit: 15 seconds (adjustable)
   Questions: Select from question bank or use all
   ```

2. **Automatic Answering Process**
   - System automatically displays questions in order
   - Participants answer independently
   - Automatic jump to next question
   - Show answering progress

### 🙋 Participant Operations

1. **Join Session**
   - Visit `http://localhost:3000/play`
   - View available session list
   - Select target session (shows session type and status)
   - Enter display name
   - Click "Join Session"

2. **Live Quiz Answering**
   - Read question content
   - Select answer (click to submit)
   - View immediate feedback
   - Monitor leaderboard

3. **Static Quiz Answering**
   - Read question content
   - Select answer
   - Click "Save & Next" to submit
   - Wait for 3-second feedback display
   - Automatic jump to next question
   - View answering progress

### 🎯 Example Test Flow

```bash
# 1. Start system
npm run dev

# 2. Live Quiz test
# Host: Visit http://localhost:3000
# Create session: live-session (Live Quiz)
# Participant: Visit http://localhost:3000/play
# Select live-session to join

# 3. Static Quiz test
# Host: Visit http://localhost:3000
# Create session: static-session (Static Quiz)
# Participant: Visit http://localhost:3000/play
# Select static-session to join
# System automatically starts answering process

# 4. Multi-user test
# Multiple browser tabs simulate multiple users
# Simultaneous answering tests real-time synchronization
```

## 🛠️ Technical Architecture

### Technology Stack
```
Frontend: React 18 + TypeScript + Vite + TailwindCSS
Backend: Node.js + Express + Socket.IO + TypeScript
Build: Vite + TypeScript Compiler
Communication: WebSocket (Socket.IO)
State Management: React Hooks + Context
```

### Project Structure
```
BingoQuiz/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── routes/         # Page routes
│   │   ├── realtime/       # Socket.IO client
│   │   ├── types.ts        # TypeScript types
│   │   └── utils/          # Utility functions
│   └── public/             # Static resources
├── server/                 # Backend Node.js service
│   ├── index.ts           # Main server file
│   ├── sessionStore.ts    # Session state management
│   └── types.ts           # Server type definitions
├── public/                # Shared static resources
│   ├── questions.json     # Default question bank
│   └── sample-questions.json # Sample question bank
└── docs/                  # System documentation
```

### Core Components

#### Frontend Core
- **Host.tsx**: Live Quiz host control panel
- **StaticQuiz.tsx**: Static Quiz host control panel
- **Play.tsx**: Participant answering interface
- **SessionSelector.tsx**: Session selector
- **useQuizLive.ts**: Real-time state management Hook
- **socketManager.ts**: WebSocket connection management

#### Backend Core
- **index.ts**: Express + Socket.IO server
- **sessionStore.ts**: In-memory session storage
- **Socket Event Handling**: Real-time data synchronization

## 📚 Documentation

### 📖 Documentation
- **[User Flow and Feature Design](./User%20Flow%20and%20Feature%20Design.md)**: Complete user flow explanation and feature design philosophy

## 🔧 Development Guide

### Development Environment Setup

```bash
# Install dependencies
npm run install-all

# Start development server
npm run dev

# Start frontend and backend separately
npm run server:dev  # Backend development server
npm run client:dev  # Frontend development server
```

### Build and Deploy

```bash
# Build production version
npm run build

# Start production server
npm start
```

### Custom Question Bank

Create JSON file with the following format:

```json
[
  {
    "id": "q1",
    "index": 1,
    "text": "Question content?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct Answer"
  }
]
```

### Environment Configuration

Create `server/.env` file:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Extension Development

#### Adding New Socket Events
```typescript
// Client
socket.emit('custom:event', data);

// Server
socket.on('custom:event', (data) => {
  // Handle logic
});
```

#### Adding New React Components
```typescript
// components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  // Property definitions
}

export const NewComponent: React.FC<NewComponentProps> = ({ props }) => {
  return (
    <div className="new-component">
      {/* Component content */}
    </div>
  );
};
```

## 🧪 Testing

### Functional Testing
```bash
# Live Quiz test
# 1. Host creates Live Quiz session
# 2. Participants join session
# 3. Host sets questions
# 4. Participants answer
# 5. Verify real-time synchronization

# Static Quiz test
# 1. Host creates Static Quiz session
# 2. Participants join session
# 3. System automatically starts answering
# 4. Participants complete all questions
# 5. Verify automatic jump and progress display

# Multi-user test
# 1. Multiple browser tabs simulate multiple users
# 2. Simultaneous answering tests real-time synchronization
# 3. Verify leaderboard updates
```

### Performance Testing
```bash
# Connection stress test
# Use multiple browser tabs to connect simultaneously

# Memory usage monitoring
node --inspect server/index.js
```

## 🤝 Contributing

### Bug Reports
1. Use clear titles to describe issues
2. Provide detailed reproduction steps
3. Include error logs and screenshots
4. Explain expected behavior

### Feature Requests
1. Describe the purpose and value of new features
2. Provide detailed feature descriptions
3. Consider impact on existing functionality

### Development Contributions
1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

## 🔒 Security Considerations

- Recommended for use in internal networks
- Regularly update dependencies to fix security vulnerabilities
- Implement appropriate access control and monitoring



**🎯 Start Your BingoQuiz Journey!**

If you find this project useful, please give us a ⭐ Star!