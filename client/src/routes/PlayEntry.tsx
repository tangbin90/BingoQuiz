import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play } from './Play';
import { SessionSelector } from './SessionSelector';

export const PlayEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  // 如果有sessionId参数，显示Play页面
  // 如果没有sessionId参数，显示SessionSelector页面
  return sessionId ? <Play /> : <SessionSelector />;
};
