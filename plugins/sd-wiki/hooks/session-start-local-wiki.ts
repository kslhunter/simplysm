/** SessionStart hook (플러그인 sd-wiki) — 로컬 프로젝트 위키(.wiki/) ROOT MAP 주입.
 *
 * 프로젝트 루트의 `.wiki/` 최상위 라우팅 목록을 주입한다. `.wiki/` 가 없으면 무주입(정상).
 * 로컬 파일시스템만 읽는 정적 주입 — 인증·네트워크 의존인 원격 ROOT MAP
 * 주입(session-start-rootmap.ts)과 별개 파일·별개 SessionStart command 로 분리.
 *
 * 출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stdout 에 절대
 * 찍지 않음(stderr 만).
 */

import { buildLocalWikiRootmap } from "../shared/local-wiki.ts";
import { readStdinJsonRecord } from "../shared/wiki-util.ts";

async function main(): Promise<void> {
  try {
    const data = await readStdinJsonRecord();
    const cwd = data?.["cwd"];
    const projectDir = typeof cwd === "string" && cwd ? cwd : process.cwd();

    const context = await buildLocalWikiRootmap(projectDir);
    if (context) process.stdout.write(context);
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
}

await main();
