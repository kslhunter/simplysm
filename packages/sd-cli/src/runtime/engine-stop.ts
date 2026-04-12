/**
 * 빌드 엔진(BaseEngine, EsbuildClientEngine)의 공유 중지 로직.
 *
 * 엔진 구현체 간 shutdown 타임아웃 + stopWatch 경쟁 + terminate
 * 패턴의 중복을 방지하기 위해 추출하였다.
 */

const SHUTDOWN_TIMEOUT = 3000;

interface StoppableWorker {
  stopWatch(...args: unknown[]): Promise<unknown>;
  terminate(): Promise<unknown>;
}

/**
 * 빌드 엔진 워커를 정상적으로 중지한다.
 *
 * watch 모드에서는 타임아웃 가드와 함께 `stopWatch()`를 시도하여
 * 멈춘 워커가 종료를 차단하지 않도록 한다. 이후 워커를 무조건 종료한다.
 *
 * @param worker - 중지할 워커 프록시 (시작하지 않았으면 undefined)
 * @param isWatchMode - watch 모드 여부
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
      // stopWatch 실패해도 계속 진행
    }
  }

  if (worker != null) {
    await worker.terminate();
  }
}
