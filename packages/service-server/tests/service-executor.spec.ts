import { describe, it, expect } from "vitest";
import { runServiceMethod } from "../src/core/service-executor";
import { defineService, auth } from "../src/core/define-service";

// Minimal mock server
function createMockServer(services: any[]) {
  return { options: { services, auth: { jwtSecret: "test" } } } as any;
}

describe("runServiceMethod with ServiceDefinition", () => {
  it("executes a basic service method", async () => {
    const EchoService = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const server = createMockServer([EchoService]);
    const result = await runServiceMethod(server, {
      serviceName: "Echo",
      methodName: "echo",
      params: ["hello"],
    });

    expect(result).toBe("Echo: hello");
  });

  it("throws when service not found", async () => {
    const server = createMockServer([]);

    await expect(
      runServiceMethod(server, { serviceName: "Unknown", methodName: "test", params: [] }),
    ).rejects.toThrow("Service [Unknown] not found.");
  });

  it("throws when method not found", async () => {
    const svc = defineService("Test", (_ctx) => ({
      existing: () => "ok",
    }));
    const server = createMockServer([svc]);

    await expect(
      runServiceMethod(server, { serviceName: "Test", methodName: "nonexistent", params: [] }),
    ).rejects.toThrow("Method [Test.nonexistent] not found.");
  });

  it("blocks unauthenticated access to auth-required service", async () => {
    const svc = defineService(
      "Protected",
      auth((_ctx) => ({
        secret: () => "secret",
      })),
    );
    const server = createMockServer([svc]);

    await expect(
      runServiceMethod(server, { serviceName: "Protected", methodName: "secret", params: [] }),
    ).rejects.toThrow("Login is required.");
  });

  it("blocks unauthorized role access", async () => {
    const svc = defineService(
      "Admin",
      auth((_ctx) => ({
        manage: auth(["admin"], () => "managed"),
        view: () => "viewed",
      })),
    );
    const server = createMockServer([svc]);

    // Has auth but wrong role
    await expect(
      runServiceMethod(server, {
        serviceName: "Admin",
        methodName: "manage",
        params: [],
        http: { clientName: "test", authTokenPayload: { roles: ["user"], data: {} } as any },
      }),
    ).rejects.toThrow("Insufficient permissions.");
  });

  it("allows access with correct role", async () => {
    const svc = defineService(
      "Admin",
      auth((_ctx) => ({
        manage: auth(["admin"], () => "managed"),
      })),
    );
    const server = createMockServer([svc]);

    const result = await runServiceMethod(server, {
      serviceName: "Admin",
      methodName: "manage",
      params: [],
      http: { clientName: "test", authTokenPayload: { roles: ["admin"], data: {} } as any },
    });

    expect(result).toBe("managed");
  });

  it("provides context to factory", async () => {
    const svc = defineService("Ctx", (ctx) => ({
      getClientName: () => ctx.clientName,
    }));
    const server = createMockServer([svc]);

    const result = await runServiceMethod(server, {
      serviceName: "Ctx",
      methodName: "getClientName",
      params: [],
      http: { clientName: "my-app", authTokenPayload: undefined },
    });

    expect(result).toBe("my-app");
  });
});
