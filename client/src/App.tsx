import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Host } from './routes/Host';
import { StaticQuiz } from './routes/StaticQuiz';
import { HostEntry } from './routes/HostEntry';
import { PlayEntry } from './routes/PlayEntry';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 主入口 - Session配置 */}
          <Route path="/" element={<HostEntry />} />
          
          {/* Live Quiz管理页面 */}
          <Route path="/live/:sessionId?" element={<Host />} />
          
          {/* Static Quiz管理页面 */}
          <Route path="/static/:sessionId?" element={<StaticQuiz />} />
          
          {/* 参与者页面 */}
          <Route path="/play" element={<PlayEntry />} />
          <Route path="/participant" element={<PlayEntry />} />
          
          {/* 重定向 */}
          <Route path="/setup" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;