import os from "os";

/**
 * 제한된 동시성으로 태스크 함수를 실행한다.
 * 공유 인덱스 패턴을 사용 — 각 워커가 다음 사용 가능한 태스크를 소비한다.
 *
 * @param tasks 실행할 비동기 태스크 함수 배열
 * @param concurrency 동시에 실행할 최대 태스크 수
 * @returns 입력 태스크와 동일한 순서의 PromiseSettledResult 배열
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
 * CPU 코어 수 기반으로 최대 동시성을 반환한다.
 * 사용 가능한 코어의 7/8을 사용한다 (최소 1).
 */
export function getMaxConcurrency(): number {
  return Math.max(Math.floor((os.cpus().length * 7) / 8), 1);
}
