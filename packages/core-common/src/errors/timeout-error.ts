import { SdError } from "./sd-error";

/**
 * Timeout error
 *
 * An error that occurs when the waiting time is exceeded.
 * Automatically thrown when the maximum number of attempts is exceeded in async waiting functions like Wait.until().
 *
 * @example
 * // Automatically thrown from Wait.until
 * try {
 *   await Wait.until(() => isReady, 100, 50); // 100ms interval, max 50 attempts
 * } catch (err) {
 *   if (err instanceof TimeoutError) {
 *     console.log("Timeout exceeded");
 *   }
 * }
 *
 * @example
 * // Thrown directly
 * if (elapsed > maxTime) {
 *   throw new TimeoutError(undefined, "Waiting for API response exceeded");
 * }
 */
export class TimeoutError extends SdError {
  /**
   * @param count Number of attempts
   * @param message Additional message
   */
  constructor(count?: number, message?: string) {
    super(
      "Waiting time exceeded" +
        (count != null ? `(${count} attempts)` : "") +
        (message != null ? `: ${message}` : ""),
    );
    this.name = "TimeoutError";
  }
}
