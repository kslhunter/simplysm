/* eslint-disable no-console */

import { execSync } from "child_process";
import * as path from "path";

function needsDocker(): boolean {
  const args = process.argv.join(" ");

  // 특정 패키지 테스트 시
  if (/packages[\\/]/.test(args)) {
    // orm-node가 포함된 경우만 Docker 필요
    return args.includes("orm-node");
  }

  // 전체 테스트 시 Docker 필요
  return true;
}

export async function setup() {
  if (!needsDocker()) {
    console.log("[global-setup] Docker not needed, skipping...");
    return;
  }

  console.log("[global-setup] Starting Docker containers...");

  const composePath = path.resolve(__dirname, "docker-compose.test.yml");

  try {
    execSync(`docker-compose -f "${composePath}" up -d --wait`, {
      stdio: "inherit",
    });

    console.log("[global-setup] Docker containers started, creating MSSQL database...");

    // MSSQL TestDb 생성 (MySQL, PostgreSQL은 docker-compose에서 자동 생성)
    for (let i = 0; i < 10; i++) {
      try {
        execSync(
          `docker exec simplysm-mssql-1 /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb"`,
          { stdio: "pipe" },
        );
        console.log("[global-setup] MSSQL TestDb created.");
        break;
      } catch {
        console.log(`[global-setup] MSSQL not ready, retrying... (${i + 1}/10)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    console.log("[global-setup] All databases ready.");
  } catch (err) {
    console.error("[global-setup] Failed to start Docker containers:", err);
    throw err;
  }
}

export function teardown() {
  if (!needsDocker()) {
    return;
  }

  console.log("[global-setup] Stopping Docker containers...");

  const composePath = path.resolve(__dirname, "docker-compose.test.yml");

  try {
    execSync(`docker-compose -f "${composePath}" down`, {
      stdio: "inherit",
    });
    console.log("[global-setup] Docker containers stopped.");
  } catch (err) {
    console.error("[global-setup] Failed to stop Docker containers:", err);
  }
}
