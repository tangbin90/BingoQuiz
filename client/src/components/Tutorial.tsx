import React from 'react';

interface TutorialProps {
  onComplete: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  return (
    <div className="container">
      <div className="tutorial">
        <h2>🎉 欢迎来到 Bingo Quiz！</h2>
        <p style={{ textAlign: 'center', marginBottom: '30px', fontSize: '18px' }}>
          这是一个有趣的在线答题应用，让我们来了解一下如何使用：
        </p>
        
        <ol>
          <li>
            <strong>答题规则：</strong>
            每次只会显示一道题目，您需要从四个选项中选择正确答案。
          </li>
          <li>
            <strong>时间限制：</strong>
            每道题都有倒计时，如果时间到了还没回答，系统会自动判为错误。
          </li>
          <li>
            <strong>即时反馈：</strong>
            回答后立即显示是否正确，并显示正确答案。
          </li>
          <li>
            <strong>实时分数：</strong>
            页面顶部会显示您的当前得分和答题进度。
          </li>
          <li>
            <strong>答题技巧：</strong>
            仔细阅读题目，不要被干扰选项迷惑，相信自己的第一直觉！
          </li>
        </ol>
        
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            className="btn btn-success"
            onClick={onComplete}
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
            开始答题 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;

