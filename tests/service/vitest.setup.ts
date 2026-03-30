import { createServiceServer } from "@simplysm/service-server";
import { TestService, type TestAuthInfo } from "./src/test-service";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Compute path from current file location based on import.meta.url (vitest globalSetup compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

// Test port
export const TEST_PORT = 23100;

// Server instance
let testServer: ReturnType<typeof createServiceServer<TestAuthInfo>> | undefined;

export async function setup() {
  console.log("[service] Setting up test environment...");

  // Create www directory (for static file serving)
  const wwwDir = path.join(rootDir, "www", "test-client");
  if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
  }

  // Create test static file
  const testFilePath = path.join(wwwDir, "test.txt");
  fs.writeFileSync(testFilePath, "Hello from static file!");

  // Create upload directory
  const uploadDir = path.join(rootDir, "www", "_upload");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create and start server
  testServer = createServiceServer<TestAuthInfo>({
    rootPath: rootDir,
    port: TEST_PORT,
    auth: {
      jwtSecret: "test-secret-key-for-jwt-signing",
    },
    services: [TestService],
  });

  await Promise.race([
    testServer.listen(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`[service] Server start timed out after 10s on port ${TEST_PORT}`)), 10_000);
    }),
  ]);
  console.log(`[service] Test server started on port ${TEST_PORT}`);
}

export async function teardown() {
  console.log("[service] Tearing down test environment...");

  // Close server
  if (testServer?.isOpen === true) {
    await Promise.race([
      testServer.close(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("[service] Server close timed out after 10s")), 10_000);
      }),
    ]);
  }

  // Clean up test directory
  const wwwDir = path.join(rootDir, "www");
  if (fs.existsSync(wwwDir)) {
    fs.rmSync(wwwDir, { recursive: true, force: true });
  }

  console.log("[service] Test environment cleaned up");
}
