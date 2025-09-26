/**
 * 时间相关工具函数
 */

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeMs(milliseconds: number): string {
  return formatTime(Math.floor(milliseconds / 1000));
}

export function calculateTimeRemaining(startedAt: number, timeLimitMs: number): number {
  const now = Date.now();
  const elapsed = now - startedAt;
  return Math.max(0, timeLimitMs - elapsed);
}

export function isTimeUp(startedAt: number, timeLimitMs: number): boolean {
  return calculateTimeRemaining(startedAt, timeLimitMs) <= 0;
}

export function getDeadline(startedAt: number, timeLimitMs: number): number {
  return startedAt + timeLimitMs;
}

export function calculateElapsedTime(startedAt: number): number {
  return Date.now() - startedAt;
}

export function createTimer(startedAt: number, timeLimitMs: number, onTick: (remaining: number) => void, onComplete: () => void) {
  let intervalId: NodeJS.Timeout;
  
  const tick = () => {
    const remaining = calculateTimeRemaining(startedAt, timeLimitMs);
    
    if (remaining <= 0) {
      clearInterval(intervalId);
      onComplete();
    } else {
      onTick(remaining);
    }
  };
  
  intervalId = setInterval(tick, 100); // 100ms 更新频率
  
  return {
    stop: () => clearInterval(intervalId),
    getRemaining: () => calculateTimeRemaining(startedAt, timeLimitMs)
  };
}
