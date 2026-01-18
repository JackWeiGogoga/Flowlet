/**
 * 通用工具函数
 */

/**
 * 生成唯一 ID
 * 用于生成条件分支、条件项等的唯一标识
 */
export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
