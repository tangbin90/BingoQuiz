/**
 * 确定性选项打乱算法（客户端版本）
 */

export function createSeed(userId: string, questionId: string): number {
  let hash = 0;
  const str = userId + questionId;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash);
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  let randomIndex: number;
  
  // Fisher-Yates 洗牌算法
  while (currentIndex > 0) {
    randomIndex = Math.floor(seededRandom(seed + currentIndex) * currentIndex);
    currentIndex--;
    
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex], 
      shuffled[currentIndex]
    ];
  }
  
  return shuffled;
}

export function shuffleQuestionOptions(
  options: string[], 
  userId: string, 
  questionId: string
): string[] {
  const seed = createSeed(userId, questionId);
  return shuffleArray(options, seed);
}
