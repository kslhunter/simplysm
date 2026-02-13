import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setup() {
  console.log("[orm] Starting Docker containers...");

  const composePath = path.resolve(__dirname, "docker-compose.test.yml");

  try {
    execSync(`docker compose -f "${composePath}" up -d --wait`, {
      stdio: "inherit",
    });

    console.log("[orm] Docker containers started, creating MSSQL database...");

    // MSSQL TestDb 생성 (MySQL, PostgreSQL은 docker compose에서 자동 생성)
    for (let i = 0; i < 10; i++) {
      try {
        execSync(
          `docker compose -f "${composePath}" exec -T mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb"`,
          { stdio: "pipe" },
        );
        console.log("[orm] MSSQL TestDb created.");
        break;
      } catch {
        console.log(`[orm] MSSQL not ready, retrying... (${i + 1}/10)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    console.log("[orm] All databases ready.");
  } catch (err) {
    console.error("[orm] Failed to start Docker containers:", err);
    throw err;
  }
}

export function teardown() {
  console.log("[orm] Stopping Docker containers...");

  const composePath = path.resolve(__dirname, "docker-compose.test.yml");

  try {
    execSync(`docker compose -f "${composePath}" down`, {
      stdio: "inherit",
    });
    console.log("[orm] Docker containers stopped.");
  } catch (err) {
    console.error("[orm] Failed to stop Docker containers:", err);
  }
}
