import pino, { type Logger } from "pino";
import ora, { type Ora } from "ora";

/**
 * CLI 컨텍스트 생성 결과
 */
export interface CliContext {
  /** pino 로거 */
  logger: Logger;
  /** ora 스피너 (debug 모드에서는 undefined) */
  spinner: Ora | undefined;
}

/**
 * CLI 명령어에서 공통으로 사용하는 로거/스피너 컨텍스트를 생성합니다.
 *
 * - debug 모드: 로거 활성화, 스피너 비활성화
 * - 일반 모드: 로거 비활성화, 스피너 활성화
 *
 * @param name - 로거 이름 (예: "sd-cli:lint")
 * @param debug - debug 모드 여부
 * @param initialText - 스피너 초기 텍스트
 */
export function createCliContext(name: string, debug: boolean, initialText: string): CliContext {
  const logger = pino({
    name,
    level: debug ? "debug" : "silent",
    transport: debug ? { target: "pino-pretty" } : undefined,
  });

  const spinner = debug ? undefined : ora(initialText).start();

  return { logger, spinner };
}
