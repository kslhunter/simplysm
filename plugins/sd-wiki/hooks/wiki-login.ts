/** 비차단 백그라운드 로그인 + 세션 skip-lock (플러그인 sd-wiki hook).
 *
 * 미인증·만료 시 `session-start-rootmap.ts` 가 위임하는, 비차단 백그라운드 브라우저 로그인의
 * hook 전용 진입점. lock/worker 공통 로직은 shared/wiki-login.ts 에 둔다.
 */

import {
  isWikiSessionSkipped,
  markWikiSessionSkipped,
  runWikiBackgroundLoginWorkerFromArgv,
  triggerWikiBackgroundLogin,
} from "../shared/wiki-login.ts";

const DATA_DIR_ENV_NAMES = ["CLAUDE_PLUGIN_DATA"] as const;
const WORKER_ARG = "--worker";
const PLUGIN_ROOT_ENV = "CLAUDE_PLUGIN_ROOT";

export function markSessionSkipped(sessionId: string): void {
  /** 이 세션은 위키 없이 진행됨을 표시 — 같은 session_id 의 이후 주입을 생략. */
  markWikiSessionSkipped(sessionId, DATA_DIR_ENV_NAMES);
}

export function isSessionSkipped(sessionId: string): boolean {
  return isWikiSessionSkipped(sessionId, DATA_DIR_ENV_NAMES);
}

export function triggerBackgroundLogin(): void {
  /** login-lock 을 단발 획득한 뒤 detached worker 프로세스로 브라우저 로그인을 시작.
   *
   * lock 이 이미 있으면(다른 세션·프로세스가 진행 중이거나 끝난 직후) 아무것도 안 함.
   */
  const pluginRoot = process.env[PLUGIN_ROOT_ENV];
  if (!pluginRoot) return;

  triggerWikiBackgroundLogin({
    pluginRoot,
    workerScriptUrl: import.meta.url,
    workerArg: WORKER_ARG,
    pluginRootEnvName: PLUGIN_ROOT_ENV,
    dataDirEnvNames: DATA_DIR_ENV_NAMES,
  });
}

async function main(argv: readonly string[]): Promise<number> {
  await runWikiBackgroundLoginWorkerFromArgv(argv, WORKER_ARG, PLUGIN_ROOT_ENV);
  return 0;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
