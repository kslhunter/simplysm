import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
import { defineEvent } from "@simplysm/service-common";
import type { TestServiceMethods, TestAuthInfo } from "./test-service";
import * as jose from "jose";

const TEST_PORT = 23100;
const JWT_SECRET = new TextEncoder().encode("test-secret-key-for-jwt-signing");

/** Create test JWT */
async function createTestToken(authInfo: TestAuthInfo): Promise<string> {
  // Create token matching server's AuthTokenPayload format
  // { roles: string[], data: TAuthInfo }
  const payload = {
    roles: authInfo.roles,
    data: authInfo,
  };
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(JWT_SECRET);
}

/** Test event */
const TestEvent = defineEvent<{ channel: string }, string>("TestEvent");

describe("ServiceClient browser test", () => {
  let client: ServiceClient;

  beforeAll(async () => {
    // Check browser environment
    expect(typeof Worker).toBe("function");
    expect(typeof window).toBe("object");

    client = createServiceClient("test-client", {
      host: "localhost",
      port: TEST_PORT,
      ssl: false,
      maxReconnectCount: 0,
    });

    await client.connect();
  });

  afterAll(async () => {
    await client.close();
  });

  describe("Worker environment check", () => {
    it("Worker API available in browser environment", () => {
      expect(typeof Worker).toBe("function");
    });

    it("WebSocket connection successful", () => {
      expect(client.connected).toBe(true);
    });
  });

  describe("Service call", () => {
    it("Call echo method", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.echo("Hello from Browser");
      expect(result).toBe("Echo: Hello from Browser");
    });

    it("Return complex object (serialization/deserialization)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.getComplexData();

      expect(result.number).toBe(42);
      expect(result.string).toBe("hello");
      expect(result.array).toEqual([1, 2, 3]);
      expect(result.nested).toEqual({ a: "nested", b: 99 });
      expect(result.date).toBeInstanceOf(Date);
    });
  });

  describe("Large data (Worker test)", () => {
    it("Process data <= 30KB (main thread)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.getLargeData(25); // 25KB
      expect(result.length).toBe(25 * 1024);
    });

    it("Process data > 30KB (using Worker)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // Request 50KB data - Worker should handle it
      const result = await svc.getLargeData(50);
      expect(result.length).toBe(50 * 1024);
    });

    it("Process large data 100KB (using Worker)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // Request 100KB data
      const result = await svc.getLargeData(100);
      expect(result.length).toBe(100 * 1024);
    });

    it("Call progress callback for data > 3MB", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // Track progress callback
      const progressStates: Array<{ totalSize: number; completedSize: number }> = [];

      client.on("response-progress", (state) => {
        progressStates.push({ totalSize: state.totalSize, completedSize: state.completedSize });
      });

      // Request 4MB data (chunking occurs)
      const result = await svc.getLargeData(4 * 1024);
      expect(result.length).toBe(4 * 1024 * 1024);

      // Progress callback should have been called
      expect(progressStates.length).toBeGreaterThan(0);

      // Last progress should be complete
      const lastProgress = progressStates[progressStates.length - 1];
      expect(lastProgress.completedSize).toBe(lastProgress.totalSize);
    });
  });

  describe("Authentication and authorization", () => {
    it("Send auth token and retrieve auth info", async () => {
      // Create JWT token
      const authInfo: TestAuthInfo = {
        userId: "test-user-1",
        userName: "Test User",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);

      // Authenticate
      await client.auth(token);

      // Retrieve auth info
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.getAuthInfo();

      expect(result).toBeDefined();
      expect(result?.userId).toBe("test-user-1");
      expect(result?.userName).toBe("Test User");
      expect(result?.roles).toContain("user");
    });

    it("Admin-required method - no permission", async () => {
      // Regular user token
      const authInfo: TestAuthInfo = {
        userId: "normal-user",
        userName: "Normal User",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      const svc = client.getService<TestServiceMethods>("TestService");

      // Expect permission error
      await expect(svc.adminOnly()).rejects.toThrow();
    });

    it("Admin-required method - with permission", async () => {
      // Admin token
      const authInfo: TestAuthInfo = {
        userId: "admin-user",
        userName: "Admin User",
        roles: ["admin"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.adminOnly();

      expect(result).toBe("Admin access granted");
    });
  });

  describe("Error handling", () => {
    it("Service method error propagation", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      await expect(svc.throwError("Test error message")).rejects.toThrow("Test error message");
    });

    it("Subsequent request processed normally after error", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // Error occurs
      await expect(svc.throwError("Error")).rejects.toThrow();

      // Subsequent request processed normally
      const result = await svc.echo("Normal request");
      expect(result).toBe("Echo: Normal request");
    });
  });

  describe("Event listener", () => {
    it("Register and remove event listener", async () => {
      // Admin auth (may be needed for event registration)
      const authInfo: TestAuthInfo = {
        userId: "event-test-user",
        userName: "Event Test",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      // Event receive callback
      const receivedData: string[] = [];
      const listenerKey = await client.addEventListener(
        TestEvent,
        { channel: "test-channel" },
        (data) => {
          receivedData.push(data);
          return Promise.resolve();
        },
      );

      expect(listenerKey).toBeDefined();
      expect(typeof listenerKey).toBe("string");

      // Remove listener
      await client.removeEventListener(listenerKey);
    });
  });
});
