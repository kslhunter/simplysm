import { type ConsolaInstance } from "consola";
import { setupConsola } from "@simplysm/core-node";

/**
 * 워커 스레드에서 consola를 설정한다.
 * 워커 모듈 최상위에서 호출해야 한다.
 */
export function setupWorkerConsola(): void {
  setupConsola();
}

/**
 * 워커 프로세스 종료 시그널에 대한 정리 핸들러를 등록한다.
 *
 * 프로세스 종료 전 리소스를 정상적으로 정리하기 위해 SIGINT와 SIGTERM 핸들러를 등록한다.
 * 두 핸들러 모두 정리 함수를 실행하고 코드 0으로 종료한다.
 *
 * @param cleanup - 종료 시 실행할 정리 함수 (동기 또는 비동기)
 * @param logger - 에러 로깅용 consola 로거 인스턴스
 */
export function registerCleanupHandlers(
  cleanup: () => void | Promise<void>,
  logger: ConsolaInstance,
): void {
  const handleSignal = () => {
    Promise.resolve(cleanup())
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        logger.error("정리 작업 실패", err);
        process.exit(1);
      });
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}

/**
 * Worker 함수의 중복 호출을 방지하는 가드를 생성한다.
 *
 * @param label - 에러 메시지에 사용할 함수명
 * @returns 두 번 호출되면 에러를 던지는 가드 함수
 */
export function createOnceGuard(label: string): () => void {
  let called = false;
  return () => {
    if (called) {
      throw new Error(`${label} can only be called once per Worker`);
    }
    called = true;
  };
}
