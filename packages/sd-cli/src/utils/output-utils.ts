import { consola } from "consola";
import type { BuildResult } from "../infra/ResultCollector";

/**
 * Format build warning/error messages
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
 * Print only errors
 * @param results Build result status per package
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
 * Print server URLs only
 * @param results Build result status per package
 * @param serverClientsMap List of connected clients per server
 */
export function printServers(
  results: Map<string, BuildResult>,
  serverClientsMap?: Map<string, string[]>,
): void {
  // Collect server info
  const servers = [...results.values()].filter((r) => r.status === "running" && r.port != null);

  // Print server info (add blank line before if present)
  if (servers.length > 0) {
    process.stdout.write("\n");
    for (const server of servers) {
      if (server.target === "server") {
        // If server has connected clients, print only client URLs
        const clients = serverClientsMap?.get(server.name) ?? [];
        if (clients.length > 0) {
          for (const clientName of clients) {
            consola.info(`[server] http://localhost:${server.port}/${clientName}/`);
          }
        } else {
          // If no connected clients, print server root URL
          consola.info(`[server] http://localhost:${server.port}/`);
        }
      } else {
        // Standalone client: print with name included
        consola.info(`[server] http://localhost:${server.port}/${server.name}/`);
      }
    }
  }
}
