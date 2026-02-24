import type { ConsolaInstance } from "consola";

/**
 * Register cleanup handlers for worker process shutdown signals
 *
 * Registers SIGINT and SIGTERM handlers to gracefully cleanup resources
 * before process exit. Both handlers execute the cleanup function and
 * exit with code 0.
 *
 * @param cleanup - Async cleanup function to execute on shutdown
 * @param logger - Consola logger instance for error logging
 */
export function registerCleanupHandlers(
  cleanup: () => Promise<void>,
  logger: ConsolaInstance,
): void {
  const handleSignal = () => {
    cleanup()
      .catch((err) => {
        logger.error("cleanup 실패", err);
      })
      .finally(() => {
        process.exit(0);
      });
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}

/**
 * Worker 함수의 중복 호출을 방지하는 가드를 생성한다.
 *
 * @param label - 에러 메시지에 사용할 함수명
 * @returns 호출 시 중복이면 에러를 throw하는 가드 함수
 */
export function createOnceGuard(label: string): () => void {
  let called = false;
  return () => {
    if (called) {
      throw new Error(`${label}는 Worker당 한 번만 호출할 수 있습니다.`);
    }
    called = true;
  };
}
