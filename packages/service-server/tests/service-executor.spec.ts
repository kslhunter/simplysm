import { describe, it, expect } from "vitest";
import { ServiceExecutor } from "../src/core/service-executor";
import { defineService, auth } from "../src/core/define-service";

// Minimal mock server
function createMockServer(services: any[]) {
  return { options: { services, auth: { jwtSecret: "test" } } } as any;
}

describe("ServiceExecutor with ServiceDefinition", () => {
  it("executes a basic service method", async () => {
    const EchoService = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const executor = new ServiceExecutor(createMockServer([EchoService]));
    const result = await executor.runMethod({
      serviceName: "Echo",
      methodName: "echo",
      params: ["hello"],
    });

    expect(result).toBe("Echo: hello");
  });

  it("throws when service not found", async () => {
    const executor = new ServiceExecutor(createMockServer([]));

    await expect(executor.runMethod({ serviceName: "Unknown", methodName: "test", params: [] })).rejects.toThrow(
      "서비스[Unknown]를 찾을 수 없습니다.",
    );
  });

  it("throws when method not found", async () => {
    const svc = defineService("Test", (_ctx) => ({
      existing: () => "ok",
    }));
    const executor = new ServiceExecutor(createMockServer([svc]));

    await expect(executor.runMethod({ serviceName: "Test", methodName: "nonexistent", params: [] })).rejects.toThrow(
      "메소드[Test.nonexistent]를 찾을 수 없습니다.",
    );
  });

  it("blocks unauthenticated access to auth-required service", async () => {
    const svc = defineService(
      "Protected",
      auth((_ctx) => ({
        secret: () => "secret",
      })),
    );
    const executor = new ServiceExecutor(createMockServer([svc]));

    await expect(executor.runMethod({ serviceName: "Protected", methodName: "secret", params: [] })).rejects.toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("blocks unauthorized role access", async () => {
    const svc = defineService(
      "Admin",
      auth((_ctx) => ({
        manage: auth(["admin"], () => "managed"),
        view: () => "viewed",
      })),
    );
    const executor = new ServiceExecutor(createMockServer([svc]));

    // Has auth but wrong role
    await expect(
      executor.runMethod({
        serviceName: "Admin",
        methodName: "manage",
        params: [],
        http: { clientName: "test", authTokenPayload: { roles: ["user"], data: {} } as any },
      }),
    ).rejects.toThrow("권한이 부족합니다.");
  });

  it("allows access with correct role", async () => {
    const svc = defineService(
      "Admin",
      auth((_ctx) => ({
        manage: auth(["admin"], () => "managed"),
      })),
    );
    const executor = new ServiceExecutor(createMockServer([svc]));

    const result = await executor.runMethod({
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
    const executor = new ServiceExecutor(createMockServer([svc]));

    const result = await executor.runMethod({
      serviceName: "Ctx",
      methodName: "getClientName",
      params: [],
      http: { clientName: "my-app", authTokenPayload: undefined },
    });

    expect(result).toBe("my-app");
  });
});
