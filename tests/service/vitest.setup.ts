import { createServiceServer } from "@simplysm/service-server";
import { TestService, type TestAuthInfo } from "./src/test-service";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// import.meta.url 기반으로 현재 파일 위치에서 경로 계산 (vitest globalSetup 호환)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

// 테스트 포트
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

  await testServer.listen();
  console.log(`[service] Test server started on port ${TEST_PORT}`);
}

export async function teardown() {
  console.log("[service] Tearing down test environment...");

  // Close server
  if (testServer?.isOpen === true) {
    await testServer.close();
  }

  // Clean up test directory
  const wwwDir = path.join(rootDir, "www");
  if (fs.existsSync(wwwDir)) {
    fs.rmSync(wwwDir, { recursive: true, force: true });
  }

  console.log("[service] Test environment cleaned up");
}
