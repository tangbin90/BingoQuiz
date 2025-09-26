/**
 * 确定性选项打乱算法
 * 使用 Fisher-Yates 算法，种子基于 userId + questionId
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

// 测试函数
export function testShuffleConsistency(): void {
  const options = ['A', 'B', 'C', 'D'];
  const userId = 'user1';
  const questionId = 'q1';
  
  // 多次打乱应该得到相同结果
  const result1 = shuffleQuestionOptions(options, userId, questionId);
  const result2 = shuffleQuestionOptions(options, userId, questionId);
  
  console.log('一致性测试:', JSON.stringify(result1) === JSON.stringify(result2));
  console.log('用户1结果:', result1);
  
  // 不同用户应该得到不同结果
  const result3 = shuffleQuestionOptions(options, 'user2', questionId);
  console.log('用户2结果:', result3);
  console.log('不同用户不同结果:', JSON.stringify(result1) !== JSON.stringify(result3));
}
