import os from "os";

/**
 * Run task functions with limited concurrency.
 * Uses a shared index pattern — each worker consumes the next available task.
 *
 * @param tasks Array of async task functions to execute
 * @param concurrency Maximum number of tasks running simultaneously
 * @returns Array of PromiseSettledResult in the same order as input tasks
 */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  if (tasks.length === 0) return [];

  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const value = await tasks[currentIndex]();
        results[currentIndex] = { status: "fulfilled", value };
      } catch (reason) {
        results[currentIndex] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Get max concurrency based on CPU cores.
 * Uses 7/8 of available cores (minimum 1).
 */
export function getMaxConcurrency(): number {
  return Math.max(Math.floor((os.cpus().length * 7) / 8), 1);
}
