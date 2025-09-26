/**
 * 时间格式化工具函数
 */

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeMs(milliseconds: number): string {
  return formatTime(Math.floor(milliseconds / 1000));
}

export function getTimeColor(seconds: number): string {
  if (seconds <= 5) return 'text-red-600';
  if (seconds <= 10) return 'text-yellow-600';
  return 'text-gray-600';
}

export function getTimeBgColor(seconds: number): string {
  if (seconds <= 5) return 'bg-red-100 border-red-300';
  if (seconds <= 10) return 'bg-yellow-100 border-yellow-300';
  return 'bg-gray-100 border-gray-300';
}
