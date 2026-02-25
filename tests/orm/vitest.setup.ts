import { execaSync } from "execa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const composePath = path.resolve(__dirname, "docker-compose.test.yml");

export async function setup() {
  console.log("[orm] Starting Docker containers...");

  try {
    execaSync("docker", ["compose", "-f", composePath, "up", "-d", "--wait"], {
      stdio: "inherit",
    });

    console.log("[orm] Docker containers started, creating MSSQL database...");

    // Create MSSQL TestDb (MySQL and PostgreSQL are created automatically by docker compose)
    let mssqlReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        execaSync("docker", [
          "compose",
          "-f",
          composePath,
          "exec",
          "-T",
          "mssql",
          "/opt/mssql-tools/bin/sqlcmd",
          "-S",
          "localhost",
          "-U",
          "sa",
          "-P",
          "YourStrong@Passw0rd",
          "-Q",
          "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb",
        ]);
        console.log("[orm] MSSQL TestDb created.");
        mssqlReady = true;
        break;
      } catch {
        console.log(`[orm] MSSQL not ready, retrying... (${i + 1}/10)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!mssqlReady) {
      throw new Error("[orm] Failed to create MSSQL TestDb after 10 retries");
    }

    console.log("[orm] All databases ready.");
  } catch (err) {
    console.error("[orm] Failed to start Docker containers:", err);
    throw err;
  }
}

export function teardown() {
  console.log("[orm] Stopping Docker containers...");

  try {
    execaSync("docker", ["compose", "-f", composePath, "down"], {
      stdio: "inherit",
    });
    console.log("[orm] Docker containers stopped.");
  } catch (err) {
    console.error("[orm] Failed to stop Docker containers:", err);
  }
}
