import { formatMessagesSync, type PartialMessage } from "esbuild";
import { consola } from "consola";
import type { BuildResult } from "../runtime/ResultCollector";

const logger = consola.withTag("sd:cli:output");

/**
 * esbuild Message 배열을 포맷된 문자열 배열로 변환한다.
 * esbuild 네이티브 포맷(코드 컨텍스트, 위치 정보, 밑줄)을 유지한다.
 */
export function formatEsbuildMessages(
  messages: PartialMessage[],
  kind: "error" | "warning",
): string[] {
  if (messages.length === 0) return [];
  return formatMessagesSync(messages, { kind, color: true }).map((msg) =>
    msg.replace(/^.*?\x1b\[0m |^X \[ERROR] |^▲ \[WARNING] /, "").trimEnd(),
  );
}

/**
 * 빌드 경고/에러 메시지를 포맷팅한다.
 */
export function formatBuildMessages(name: string, label: string, messages: string[]): string {
  const lines: string[] = [`${name} (${label})`];
  for (const msg of messages) {
    for (const line of msg.split("\n")) {
      if (line === "") {
        lines.push("");
      } else {
        lines.push(`  ${line}`);
      }
    }
  }
  return lines.join("\n");
}

/**
 * 에러와 경고를 출력한다. 에러를 먼저, 경고를 나중에 출력한다.
 * @param results 패키지별 빌드 결과 상태
 */
export function printDiagnostics(results: ReadonlyMap<string, BuildResult>): void {
  // 에러 출력
  for (const result of results.values()) {
    if (result.status === "error") {
      const typeLabel = result.type === "lint" ? "lint" : result.target;
      if (result.message != null && result.message !== "") {
        logger.error(formatBuildMessages(result.name, typeLabel, [result.message]));
      } else {
        logger.error(`[${result.name}] (${typeLabel}) 실패`);
      }
    }
  }

  // 경고 출력
  for (const result of results.values()) {
    if (result.warnings != null && result.warnings !== "") {
      const typeLabel = result.type === "lint" ? "lint" : result.target;
      logger.warn(formatBuildMessages(result.name, typeLabel, [result.warnings]));
    }
  }
}

/**
 * 서버 URL만 출력한다.
 * @param results 패키지별 빌드 결과 상태
 * @param serverClientsMap 서버별 연결된 클라이언트 목록
 */
export function printServers(
  results: ReadonlyMap<string, BuildResult>,
  serverClientsMap?: ReadonlyMap<string, string[]>,
): void {
  // 서버 정보 수집
  const servers = [...results.values()].filter((r) => r.status === "running" && r.port != null);

  // 서버 정보 출력 (있으면 앞에 빈 줄 추가)
  if (servers.length > 0) {
    process.stdout.write("\n");
    for (const server of servers) {
      if (server.target === "server") {
        // 서버에 연결된 클라이언트가 있으면 클라이언트 URL만 출력
        const clients = serverClientsMap?.get(server.name) ?? [];
        const activeClients = clients.filter((c) => results.get(`${c}:build`)?.status !== "error");
        if (activeClients.length > 0) {
          for (const clientName of activeClients) {
            logger.info(`[server] http://localhost:${server.port}/${clientName}/`);
          }
        } else {
          // 연결된 클라이언트가 없으면 서버 루트 URL 출력
          logger.info(`[server] http://localhost:${server.port}/`);
        }
      } else {
        // 독립형 클라이언트: 이름 포함하여 출력
        logger.info(`[server] http://localhost:${server.port}/${server.name}/`);
      }
    }
  }
}
