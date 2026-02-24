import { consola } from "consola";
import type { BuildResult } from "../infra/ResultCollector";

/**
 * 빌드 경고/에러 메시지를 포맷팅한다.
 */
export function formatBuildMessages(name: string, label: string, messages: string[]): string {
  const lines: string[] = [`${name} (${label})`];
  for (const msg of messages) {
    for (const line of msg.split("\n")) {
      lines.push(`  → ${line}`);
    }
  }
  return lines.join("\n");
}

/**
 * 에러만 출력한다.
 * @param results 패키지별 빌드 결과 상태
 */
export function printErrors(results: Map<string, BuildResult>): void {
  for (const result of results.values()) {
    if (result.status === "error") {
      const typeLabel = result.type === "dts" ? "dts" : result.target;
      if (result.message != null && result.message !== "") {
        consola.error(formatBuildMessages(result.name, typeLabel, [result.message]));
      } else {
        consola.error(`${result.name} (${typeLabel})`);
      }
    }
  }
}

/**
 * 서버 URL만 출력한다.
 * @param results 패키지별 빌드 결과 상태
 * @param serverClientsMap 서버별 연결된 클라이언트 목록
 */
export function printServers(
  results: Map<string, BuildResult>,
  serverClientsMap?: Map<string, string[]>,
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
        if (clients.length > 0) {
          for (const clientName of clients) {
            consola.info(`[server] http://localhost:${server.port}/${clientName}/`);
          }
        } else {
          // 연결된 클라이언트가 없으면 서버 루트 URL 출력
          consola.info(`[server] http://localhost:${server.port}/`);
        }
      } else {
        // standalone client는 이름 포함해서 출력
        consola.info(`[server] http://localhost:${server.port}/${server.name}/`);
      }
    }
  }
}
