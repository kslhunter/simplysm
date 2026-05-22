import { type ConsolaInstance } from "consola";
import { createLogger } from "@simplysm/core-common";
import {
  setupWorkerConsola,
  registerCleanupHandlers,
  createOnceGuard,
} from "../runtime/worker-utils";

/**
 * Worker Thread의 공통 초기화를 단일 호출로 수행한다.
 *
 * 1. setupWorkerConsola() — consola CLI 모드 설정
 * 2. createLogger() — 워커별 태그 로거 생성
 * 3. registerCleanupHandlers() — SIGTERM/SIGINT 정리 핸들러 등록
 * 4. createOnceGuard("startWatch") — startWatch 중복 호출 방지 가드 생성
 */
export function setupWorkerLifecycle(
  workerName: string,
  cleanupFn: () => void | Promise<void>,
): { logger: ConsolaInstance; guardStartWatch: () => void } {
  setupWorkerConsola();
  const logger = createLogger(`sd:cli:${workerName}:worker`);
  registerCleanupHandlers(cleanupFn, logger);
  return { logger, guardStartWatch: createOnceGuard("startWatch") };
}
