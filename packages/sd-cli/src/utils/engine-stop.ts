/**
 * Shared stop logic for build engines (BaseEngine, ViteEngine).
 *
 * Extracted to avoid duplicating the shutdown timeout + stopWatch race + terminate
 * pattern across engine implementations.
 */

const SHUTDOWN_TIMEOUT = 3000;

interface StoppableWorker {
  stopWatch(...args: unknown[]): Promise<unknown>;
  terminate(): Promise<unknown>;
}

/**
 * Gracefully stop a build engine worker.
 *
 * In watch mode, attempts `stopWatch()` with a timeout guard so a hung worker
 * does not block shutdown. Then terminates the worker regardless.
 *
 * @param worker - The worker proxy to stop (may be undefined if never started)
 * @param isWatchMode - Whether the engine is in watch mode
 * @returns A cleanup function that nullifies the caller's worker reference
 */
export async function stopEngineWorker(
  worker: StoppableWorker | undefined,
  isWatchMode: boolean,
): Promise<void> {
  if (isWatchMode && worker != null) {
    try {
      await Promise.race([
        worker.stopWatch(),
        new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT)),
      ]);
    } catch {
      // Continue even if stopWatch fails
    }
  }

  if (worker != null) {
    await worker.terminate();
  }
}
