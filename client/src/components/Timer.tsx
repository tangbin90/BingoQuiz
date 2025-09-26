import React from 'react';
import { formatTime, getTimeColor, getTimeBgColor } from '../utils/time';

interface TimerProps {
  timeRemaining: number;
  paused?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ timeRemaining, paused = false }) => {
  const timeText = formatTime(timeRemaining);
  const colorClass = getTimeColor(timeRemaining);
  const bgClass = getTimeBgColor(timeRemaining);

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border-2 ${bgClass}`}>
      <svg 
        className={`w-5 h-5 mr-2 ${colorClass}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span className={`text-lg font-mono font-bold ${colorClass}`}>
        {paused ? '⏸️' : timeText}
      </span>
    </div>
  );
};
