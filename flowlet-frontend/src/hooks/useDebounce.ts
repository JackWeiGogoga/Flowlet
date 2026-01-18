import { useCallback, useRef } from "react";

/**
 * useDebounce hook - 防抖函数
 * @param callback 需要防抖的回调函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback;
}

/**
 * useThrottle hook - 节流函数
 * @param callback 需要节流的回调函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  );

  return throttledCallback;
}

export default useDebounce;
