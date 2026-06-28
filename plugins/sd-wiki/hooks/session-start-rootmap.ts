/** SessionStart hook (플러그인 sd-wiki) — 원격 ROOT MAP 주입.
 *
 * 원격 위키에서 ROOT MAP(최상위 라우팅 목록)을 받아 주입. 미인증·만료면 백그라운드
 * 로그인을 wiki_login 에 위임한 뒤 무주입 fail-open. 인증·네트워크·코어(wiki_core)에
 * 의존하는 동적 주입 — 의존이 전혀 다른 정적 규칙 주입(session-start-rules.ts)과 별개
 * 파일·별개 SessionStart command 로 분리돼 있다.
 *
 * 출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stdout 에 절대
 * 찍지 않음(stderr 만).
 */

import { importWikiCore } from "../shared/wiki-core.ts";
import { formatRootmap } from "../shared/wiki-rootmap.ts";
import { isSessionSkipped, markSessionSkipped, triggerBackgroundLogin } from "./wiki_login.ts";

const PLUGIN_ROOT = process.env["CLAUDE_PLUGIN_ROOT"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readStdinText(): Promise<string> {
  if (process.stdin.isTTY) return "";
  return await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += String(chunk);
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function readSessionId(): Promise<string | null> {
  let stdinData: unknown = {};
  try {
    const text = await readStdinText();
    stdinData = text ? (JSON.parse(text) as unknown) : {};
  } catch {
    stdinData = {};
  }
  const sessionId = isRecord(stdinData) ? stdinData["session_id"] : undefined;
  return typeof sessionId === "string" && sessionId ? sessionId : null;
}

async function injectRootmap(): Promise<void> {
  const sessionId = await readSessionId();

  if (sessionId && isSessionSkipped(sessionId)) return;
  if (!PLUGIN_ROOT) return;

  const wikiCore = await importWikiCore(PLUGIN_ROOT);

  function deferLogin(): void {
    // 미인증·만료: 이 세션은 위키 없이 진행하고, 백그라운드 로그인만 1회 트리거.
    if (sessionId) markSessionSkipped(sessionId);
    triggerBackgroundLogin();
  }

  let token: string | null;
  try {
    token = await wikiCore.getToken(false);
  } catch (error) {
    if (error instanceof wikiCore.WikiAuthExpired) {
      deferLogin();
      return;
    }
    if (error instanceof wikiCore.WikiAuthError) {
      // 네트워크·서버 오류 — 만료가 아니므로 로그인 트리거 없이 fail-open.
      return;
    }
    throw error;
  }

  if (token === null) {
    deferLogin();
    return;
  }

  let rootmap: unknown;
  try {
    rootmap = await wikiCore.callService("rootMap", [], token);
  } catch (error) {
    if (error instanceof wikiCore.WikiAuthExpired) {
      deferLogin();
      return;
    }
    return;
  }

  // 응답 손상이면 formatRootmap 이 throw → main 의 try 가 무주입 fail-open.
  const text = formatRootmap(rootmap);
  process.stdout.write(`## 개인 지식 위키 ROOT MAP (원격·최상위)\n\n${text}`);
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
