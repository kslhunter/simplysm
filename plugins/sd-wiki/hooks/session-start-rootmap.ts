/** SessionStart hook (플러그인 sd-wiki) — 원격 ROOT MAP 주입.
 *
 * 원격 위키에서 ROOT MAP(최상위 라우팅 목록)을 받아 주입. 미인증·만료면 백그라운드
 * 로그인을 wiki-login 에 위임한 뒤 무주입 fail-open. 인증·네트워크·서비스 코어(wiki-service)에
 * 의존하는 동적 주입 — 의존이 전혀 다른 정적 rules 주입(session-start-reference-rules.ts)과 별개
 * 파일·별개 SessionStart command 로 분리돼 있다.
 *
 * 출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stdout 에 절대
 * 찍지 않음(stderr 만).
 */

import { fetchRootMap, formatRootmapItems } from "../shared/wiki-rootmap.ts";
import { isSessionSkipped, markSessionSkipped, triggerBackgroundLogin } from "./wiki-login.ts";
import { readStdinJsonRecord } from "../shared/wiki-util.ts";

const PLUGIN_ROOT = process.env["CLAUDE_PLUGIN_ROOT"];

async function readSessionId(): Promise<string | null> {
  const data = await readStdinJsonRecord();
  const sessionId = data?.["session_id"];
  return typeof sessionId === "string" && sessionId ? sessionId : null;
}

async function injectRootmap(): Promise<void> {
  const sessionId = await readSessionId();

  if (sessionId && isSessionSkipped(sessionId)) return;
  if (!PLUGIN_ROOT) return;

  function deferLogin(): void {
    // 미인증·만료: 이 세션은 위키 없이 진행하고, 백그라운드 로그인만 1회 트리거.
    if (sessionId) markSessionSkipped(sessionId);
    triggerBackgroundLogin();
  }

  const rootmap = await fetchRootMap(deferLogin);
  if (rootmap === undefined) return;

  // 응답 손상이면 formatRootmapItems 가 throw → main 의 try 가 무주입 fail-open.
  const items = formatRootmapItems(rootmap);
  process.stdout.write(`## 원격 공용 위키 ROOT MAP (최상위)\n\n${items || "ROOT MAP 항목 없음"}`);
}

async function main(): Promise<number> {
  try {
    await injectRootmap();
  } catch {
    // SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
