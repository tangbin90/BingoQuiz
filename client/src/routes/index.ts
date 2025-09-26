// 路由配置
export const ROUTES = {
  // 主入口 - Session配置
  HOME: '/',
  
  // Live Quiz管理页面
  LIVE: '/live/:sessionId?',
  
  // Static Quiz管理页面
  STATIC: '/static/:sessionId?',
  
  // 参与者页面
  PLAY: '/play',
  PARTICIPANT: '/participant',
  
  // 重定向路径
  SETUP: '/setup', // 重定向到 /
  ADMIN: '/admin', // 重定向到 /
  HOST: '/host/:sessionId?', // 重定向到 /live
} as const;

// 路由类型
export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];
