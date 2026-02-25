/**
 * Wait utility functions
 */
import { TimeoutError } from "../errors/timeout-error";

/**
 * Wait until a condition becomes true
 * @param forwarder Condition function
 * @param milliseconds Check interval (default: 100ms)
 * @param maxCount Maximum number of attempts (undefined for unlimited)
 *
 * @note Returns immediately if the condition is true on the first call.
 * @example
 * // maxCount=3: checks condition up to 3 times, throws TimeoutError if all are false
 * await waitUntil(() => someCondition, 100, 3);
 * @throws TimeoutError when maximum number of attempts is exceeded
 */
export async function waitUntil(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void> {
  let count = 0;
  while (!(await forwarder())) {
    count++;
    if (maxCount !== undefined && count >= maxCount) {
      throw new TimeoutError(count);
    }

    await waitTime(milliseconds ?? 100);
  }
}

/**
 * Wait for a specified amount of time
 * @param millisecond Wait time (ms)
 */
export async function waitTime(millisecond: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, millisecond));
}
