/** 원격 위키 공유 코어 (플러그인 sd-wiki).
 *
 * 두 소비자 — 에이전트 CLI(`cli/wiki.ts`)와 런타임 hook(`hooks/*`, `extensions/*`) — 가 공유하는
 * opus `WikiService` 접근 코어이자 모든 의존이 향하는 단일 싱크. 위→아래 6섹션으로
 * 레이어가 드러남: ①결합상수 ②예외 ③토큰저장 ④인증 ⑤HTTP ⑥낙관락.
 *
 * 소비자는 이 모듈을 import 만 하고, 이 모듈은 소비자를 import 하지 않음(단방향 스타라
 * 순환·import 순서의존이 원천 차단됨). 진입점(`import.meta.main`)은 소비자 쪽이며 여기엔 없음 —
 * stdout/stderr 인코딩 설정도 진입점 책임이라 이 모듈에서 건드리지 않음.
 *
 * opus 는 redirect_uri 의 hostname 을 localhost/127.0.0.1 로 제한(open redirect 차단)하므로
 * 콜백은 127.0.0.1 고정. opus admin 은 해시 라우팅이라 redirect_uri·state 쿼리는 로그인
 * URL 의 해시(`#/login`) 뒤에 붙임.
 */

import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { homedir } from "node:os";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// ── ① 결합상수 ────────────────────────────────────────────────────────
// opus 위키 서버 접속 주소 — 회사 단일 내부 서버라 상수 고정. dev·로컬 테스트는 env 로 덮음.
const LOGIN_URL = process.env["SD_WIKI_LOGIN_URL"] ?? "https://opus.simplysm.co.kr/client-admin/#/login";
const API_BASE = (process.env["SD_WIKI_API_URL"] ?? "https://opus.simplysm.co.kr").replace(/\/+$/u, "");

// service-server 가 요구하는 클라이언트 식별 헤더 값(시스템 로그 clientName 으로 기록됨).
const CLIENT_NAME = "sd-wiki";

// 직원이 브라우저에서 로그인하기까지 콜백을 기다리는 한도(초).
export const LOGIN_TIMEOUT_SEC = 300;

async function dataDir(): Promise<string> {
  // 토큰 고정경로: 에이전트의 일반 Bash 셸엔 CLAUDE_PLUGIN_* env 가 주입되지 않으므로,
  // hook 과 CLI 가 같은 토큰을 보려면 env 비의존 고정경로여야 함.
  const dirPath = `${homedir()}/.claude/sd`;
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function tokenPath(): Promise<string> {
  return `${await dataDir()}/wiki-token.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileReadError(error: unknown): boolean {
  return isRecord(error) && typeof error["code"] === "string";
}

function decodeUtf8Strict(data: Buffer | Uint8Array | ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(data);
}

function jsonDumps(data: unknown): string {
  return JSON.stringify(data);
}

// ── ② 예외 ────────────────────────────────────────────────────────────
export class WikiAuthError extends Error {
  /** 위키 인증 실패(네트워크·서버 오류 등). 호출부가 fail-open 여부를 결정. */
}

export class WikiAuthExpired extends WikiAuthError {
  /** 저장 토큰이 만료·무효(refresh 401). 재로그인이 필요. */
}

export class WikiApiError extends Error {
  public constructor(message: string, public readonly statusCode?: number) {
    super(message);
  }

  public get isWriteConflict(): boolean {
    return this.message.includes("저장 충돌");
  }
}

export class WikiWriteConflict extends WikiApiError {
  /** write 낙관락 충돌 — 읽은 뒤 다른 작업자가 페이지를 먼저 바꿈.
   *
   * 머지 없는 자동 덮어쓰기 대신 최신 본문(`latest`)을 담아 throw — 호출부가
   * 변경을 최신본에 재통합해 다시 write 하도록 유도(남의 수정 유실 방지).
   */
  public constructor(message: string, public readonly latest: unknown) {
    super(message);
  }
}

// ── ③ 토큰 저장 ───────────────────────────────────────────────────────
export async function loadToken(): Promise<string | null> {
  /** 저장된 토큰을 반환. 없거나 형식이 깨졌으면 null. */
  let bytes: Buffer;
  try {
    bytes = await readFile(await tokenPath());
  } catch (error) {
    if (isFileReadError(error)) return null;
    throw error;
  }
  const text = decodeUtf8Strict(bytes);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const tok = isRecord(data) ? data["token"] : undefined;
  return typeof tok === "string" && tok ? tok : null;
}

export async function saveToken(token: string): Promise<void> {
  const targetPath = await tokenPath();
  const tempPath = `${targetPath}.tmp`;
  await writeFile(tempPath, `${jsonDumps({ token })}`, "utf8");
  await rename(tempPath, targetPath);
}

export async function clearToken(): Promise<void> {
  try {
    await unlink(await tokenPath());
  } catch (error) {
    if (isRecord(error) && error["code"] === "ENOENT") return;
    throw error;
  }
}

// ── ④ 인증 ────────────────────────────────────────────────────────────
async function readResponseText(response: Response): Promise<string> {
  return decodeUtf8Strict(await response.arrayBuffer());
}

export async function refreshToken(token: string): Promise<string> {
  /** 유효 토큰을 슬라이딩 갱신해 새 토큰을 반환. 만료·무효면 WikiAuthExpired. */
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/AuthService/refresh`, {
      method: "POST",
      body: "[]", // refresh 는 인자 없음 → 빈 파라미터 배열
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-sd-client-name": CLIENT_NAME,
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new WikiAuthError(`위키 서버에 연결할 수 없습니다: ${getErrorMessage(error)}`);
  }

  if (response.status === 401) {
    throw new WikiAuthExpired("토큰이 만료되었거나 유효하지 않습니다.");
  }
  if (!response.ok) {
    throw new WikiAuthError(`refresh 실패: HTTP ${response.status}`);
  }

  const result = JSON.parse(await readResponseText(response)) as unknown; // IAuthResult — 표준 JSON(커스텀 타입 없음)
  const newToken = isRecord(result) ? result["token"] : undefined;
  if (typeof newToken !== "string" || !newToken) {
    throw new WikiAuthError("refresh 응답에 토큰이 없습니다.");
  }
  return newToken;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function openBrowser(loginUrl: string): void {
  try {
    let childProcess;
    if (process.platform === "win32") {
      childProcess = spawn("rundll32", ["url.dll,FileProtocolHandler", loginUrl], {
        detached: true,
        stdio: "ignore",
      });
    } else if (process.platform === "darwin") {
      childProcess = spawn("open", [loginUrl], { detached: true, stdio: "ignore" });
    } else {
      childProcess = spawn("xdg-open", [loginUrl], { detached: true, stdio: "ignore" });
    }
    childProcess.unref();
  } catch {
    // 브라우저 자동 실행 실패는 무시한다.
  }
}

function waitForListen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

export async function browserLogin(timeoutSec: number = LOGIN_TIMEOUT_SEC): Promise<string> {
  /** 단발 콜백 서버를 띄우고 브라우저로 로그인 → 토큰 수신·저장 후 반환. */
  const state = randomBytes(12).toString("base64url");

  let receivedToken: string | undefined;
  let receivedState: string | undefined;
  let resolveCallback: (() => void) | undefined;

  const callbackPromise = new Promise<void>((resolve) => {
    resolveCallback = resolve;
  });

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const token = requestUrl.searchParams.get("token");
    const callbackState = requestUrl.searchParams.get("state");
    if (token === null || callbackState === null) {
      // 콜백이 아닌 부수 요청(favicon 등) — 무시하고 계속 대기
      response.writeHead(404);
      response.end();
      return;
    }

    receivedToken = token;
    receivedState = callbackState;
    const body = Buffer.from(
      "<!doctype html><meta charset=utf-8><title>인증 완료</title>" +
        "<body style='font-family:sans-serif;text-align:center;padding-top:60px'>" +
        "<h2>위키 인증이 완료되었습니다.</h2><p>이 창을 닫아도 됩니다.</p></body>",
      "utf8",
    );
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": String(body.length),
    });
    response.end(body);
    resolveCallback?.();
  });

  server.listen(0, "127.0.0.1");
  await waitForListen(server);

  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new WikiAuthError("로그인 콜백 포트를 확인할 수 없습니다.");
  }

  const redirectUri = `http://127.0.0.1:${address.port}/`;
  const loginUrl = `${LOGIN_URL}?${new URLSearchParams({ redirect_uri: redirectUri, state }).toString()}`;

  openBrowser(loginUrl);
  // 브라우저 자동 실행이 안 되는 환경(원격·SSH) 폴백: 주소 안내(stderr — stdout 오염 방지)
  console.error(`[위키 인증] 브라우저에서 로그인하세요:\n  ${loginUrl}`);

  const timeout = setTimeout(() => resolveCallback?.(), timeoutSec * 1000);
  try {
    await callbackPromise;
  } finally {
    clearTimeout(timeout);
    await closeServer(server);
  }

  if (receivedToken === undefined) {
    throw new WikiAuthError("로그인 대기 시간이 초과되었습니다.");
  }

  // CSRF 방지: 콜백 state 가 우리가 발급한 값과 일치해야 한다.
  if (receivedState !== state) {
    throw new WikiAuthError("콜백 state 가 일치하지 않습니다. (요청 위조 가능성)");
  }

  await saveToken(receivedToken);
  return receivedToken;
}

export async function getToken(allowBrowser: boolean = true): Promise<string | null> {
  /** 저장 토큰을 refresh 로 갱신해 반환.
   *
   * 토큰이 없거나 만료(401)면 재로그인(allow_browser=True)하거나 null 을 반환.
   * 네트워크·서버 오류는 WikiAuthError 로 전파(호출부가 fail-open 을 결정).
   */
  const token = await loadToken();
  if (token !== null) {
    try {
      const newToken = await refreshToken(token);
      await saveToken(newToken);
      return newToken;
    } catch (error) {
      if (!(error instanceof WikiAuthExpired)) throw error;
      await clearToken(); // 만료 → 폐기 후 재로그인 경로로
    }
  }
  if (allowBrowser) return await browserLogin();
  return null;
}

// ── ⑤ HTTP ────────────────────────────────────────────────────────────
async function parseHttpError(response: Response): Promise<string> {
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  if (body) {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (isRecord(parsed)) {
        const message = parsed["message"] ?? parsed["error"];
        if (typeof message === "string" && message) return message;
      }
    } catch {
      // JSON 이 아니면 본문 전체를 메시지로 쓴다.
    }
    return body.trim();
  }
  return `HTTP ${response.status}`;
}

export async function callService(method: string, params: unknown[], token: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/WikiService/${method}`, {
      method: "POST",
      body: jsonDumps(params),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-sd-client-name": CLIENT_NAME,
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new WikiApiError(`${method} 실패: 위키 서버에 연결할 수 없습니다: ${getErrorMessage(error)}`);
  }

  if (response.status === 401) {
    await clearToken();
    throw new WikiAuthExpired("위키 인증이 만료되었습니다.");
  }
  if (!response.ok) {
    const message = await parseHttpError(response);
    throw new WikiApiError(`${method} 실패: ${message}`, response.status);
  }

  const body = await readResponseText(response);
  if (body === "") return null;
  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new WikiApiError(`${method} 실패: 응답 JSON 을 해석할 수 없습니다.`);
  }
}

// ── ⑥ 낙관락 ──────────────────────────────────────────────────────────
// 충돌 시 에이전트에게 줄 안내 — 머지 없는 자동 덮어쓰기를 하지 않으므로,
// 최신 본문(latest)에 변경을 재통합해 --base-version 으로 다시 쓰도록 유도.
// ("저장 충돌" 단어를 피함 — is_write_conflict 의 서버 메시지 판별과 섞이지 않게.)
const CONFLICT_GUIDE =
  "쓰기 충돌: 읽은 뒤 다른 작업자가 페이지를 먼저 바꿨습니다. " +
  "남의 수정을 덮어쓰지 않도록 자동 재시도하지 않습니다 — " +
  "아래 latest(최신 제목·요약·본문)에 이번 변경을 재통합한 뒤 " +
  "`--base-version <latest.version>` 으로 다시 write 하세요.";

export async function writePage(inputData: Record<string, unknown>, token: string): Promise<unknown> {
  /** 페이지 write. 낙관락 충돌이면 최신 본문을 담아 WikiWriteConflict 로 알림.
   *
   * 머지 없는 자동 덮어쓰기를 하지 않음 — 충돌 해소는 호출부(에이전트)가
   * 최신본에 변경을 재통합하는 방식으로만 가능.
   */
  try {
    return await callService("write", [inputData], token);
  } catch (error) {
    if (!(error instanceof WikiApiError) || !error.isWriteConflict) throw error;
  }

  const latest = await callService("read", [String(inputData["topic"])], token);
  throw new WikiWriteConflict(CONFLICT_GUIDE, latest);
}
