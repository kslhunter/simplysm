import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    servicePort: number;
  }
}
import { createServiceServer } from "@simplysm/service-server";
import { TestService, type TestAuthInfo } from "./src/test-service";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { AddressInfo } from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;

let testServer: ReturnType<typeof createServiceServer<TestAuthInfo>> | undefined;

export async function setup({ provide }: TestProject) {
  console.log("[service] Setting up test environment...");

  const wwwDir = path.join(rootDir, "www", "test-client");
  if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
  }

  fs.writeFileSync(path.join(wwwDir, "test.txt"), "Hello from static file!");

  const uploadDir = path.join(rootDir, "www", "_upload");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  testServer = createServiceServer<TestAuthInfo>({
    rootPath: rootDir,
    port: 0,
    auth: {
      jwtSecret: "test-secret-key-for-jwt-signing",
    },
    services: [TestService],
  });

  await Promise.race([
    testServer.listen(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("[service] Server start timed out after 10s")), 10_000);
    }),
  ]);

  const addr = testServer.fastify.server.address() as AddressInfo;
  provide("servicePort", addr.port);
  console.log(`[service] Test server started on port ${addr.port}`);
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
