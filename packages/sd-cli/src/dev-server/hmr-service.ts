import type http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "path";
import crypto from "crypto";
import type esbuild from "esbuild";
import { WebSocketServer, type WebSocket } from "ws";

export interface HmrServiceOptions {
  /** HTTP 서버 (WebSocket upgrade 연결용) */
  httpServer: http.Server;
  /** basePath (예: "/my-app/") — 항상 /로 시작하고 /로 끝남 */
  basePath: string;
  /** templateUpdates Map (createCompilerPlugin과 공유) */
  templateUpdates: Map<string, string>;
  /** 빌드 출력 디렉토리 경로. 설정 시 파일 내용 hash로 변경 감지 (bytes 대신) */
  outDir?: string;
}

export interface HmrService {
  /** 모든 연결된 WebSocket 클라이언트에 메시지를 전송한다 */
  broadcast(message: Record<string, unknown>): void;
  /** esbuild onEnd에서 호출: 변경 판별 + WS 메시지 디스패치 (100ms 디바운스) */
  onBuildEnd(metafile: esbuild.Metafile): void;
  /** HTTP 요청 핸들러 (/@ng/component 엔드포인트). true 반환 시 처리 완료 */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean;
  /** 리소스 정리 (WebSocket 서버 종료) */
  close(): void;
}

export function createHmrService(options: HmrServiceOptions): HmrService {
  const { httpServer, basePath, templateUpdates, outDir } = options;
  const clients = new Set<WebSocket>();

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  let prevOutputs: Map<string, string> | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingMetafile: esbuild.Metafile | undefined;
  let pendingTemplateKeys: string[] | undefined;

  function onBuildEnd(metafile: esbuild.Metafile): void {
    pendingMetafile = metafile;
    pendingTemplateKeys =
      templateUpdates.size > 0 ? [...templateUpdates.keys()] : undefined;
    if (debounceTimer != null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      dispatchHmrMessage();
    }, 100);
  }

  function collectOutputs(metafile: esbuild.Metafile): Map<string, string> {
    const outputs = new Map<string, string>();
    for (const [outputPath, output] of Object.entries(metafile.outputs)) {
      const normalizedPath = outputPath.replace(/\\/g, "/");
      if (normalizedPath.endsWith(".js") || normalizedPath.endsWith(".css")) {
        let fingerprint = String(output.bytes);
        if (outDir != null) {
          try {
            const filePath = path.resolve(normalizedPath);
            const content = fs.readFileSync(filePath);
            fingerprint = crypto.createHash("md5").update(content).digest("hex");
          } catch {
            // 파일 읽기 실패 시 bytes 폴백
          }
        }
        outputs.set(normalizedPath, fingerprint);
      }
    }
    return outputs;
  }

  function dispatchHmrMessage(): void {
    if (pendingMetafile == null) return;
    const metafile = pendingMetafile;
    const snapshotKeys = pendingTemplateKeys;
    pendingMetafile = undefined;
    pendingTemplateKeys = undefined;

    const timestamp = Date.now();
    const currentOutputs = collectOutputs(metafile);

    // 1. onBuildEnd 시점에 캡처된 templateUpdates가 있으면 component-update
    if (snapshotKeys != null && snapshotKeys.length > 0) {
      broadcast({
        type: "component-update",
        ids: snapshotKeys,
        timestamp,
      });
      prevOutputs = currentOutputs;
      return;
    }

    // 2. 이전 빌드와 비교하여 JS/CSS 변경 판별
    if (prevOutputs == null) {
      // 첫 번째 빌드 → full-reload
      prevOutputs = currentOutputs;
      broadcast({ type: "full-reload" });
      return;
    }

    let jsChanged = false;
    let cssChanged = false;
    const changedCssFiles: string[] = [];

    for (const [outputPath, fingerprint] of currentOutputs) {
      const prevFingerprint = prevOutputs.get(outputPath);
      if (prevFingerprint !== fingerprint) {
        if (outputPath.endsWith(".css")) {
          cssChanged = true;
          changedCssFiles.push(outputPath.split("/").pop() ?? outputPath);
        } else {
          jsChanged = true;
        }
      }
    }

    // 삭제된 파일 체크
    for (const [outputPath] of prevOutputs) {
      if (!currentOutputs.has(outputPath)) {
        if (outputPath.endsWith(".css")) {
          cssChanged = true;
        } else {
          jsChanged = true;
        }
      }
    }

    prevOutputs = currentOutputs;

    // 3. JS 변경 없고 CSS만 변경 → css-update
    if (!jsChanged && cssChanged && changedCssFiles.length > 0) {
      broadcast({ type: "css-update", files: changedCssFiles, timestamp });
      return;
    }

    // 4. JS 변경 또는 기타 → full-reload
    broadcast({ type: "full-reload" });
  }

  function broadcast(message: Record<string, unknown>): void {
    const data = JSON.stringify(message);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  function handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const rawUrl = req.url ?? "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // basePath 제거 후 /@ng/component 확인
    let strippedPathname: string;
    if (basePath !== "/" && pathname.startsWith(basePath)) {
      strippedPathname = pathname.slice(basePath.length - 1);
    } else if (basePath === "/") {
      strippedPathname = pathname;
    } else {
      return false;
    }

    if (!strippedPathname.startsWith("/@ng/component")) {
      return false;
    }

    const componentId = parsedUrl.searchParams.get("c") ?? "";
    const body = templateUpdates.get(encodeURIComponent(componentId)) ?? "";

    res.writeHead(200, {
      "Content-Type": "text/javascript",
      "Cache-Control": "no-cache",
    });
    res.end(body);
    return true;
  }

  function close(): void {
    if (debounceTimer != null) clearTimeout(debounceTimer);
    for (const ws of clients) {
      ws.close();
    }
    clients.clear();
    wss.close();
  }

  return { broadcast, onBuildEnd, handleRequest, close };
}
