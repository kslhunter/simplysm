import { describe, it, expect } from "vitest";
import { executeServiceMethod } from "../src/core/service-executor";
import { defineService, auth } from "../src/core/define-service";

// Minimal mock server
function createMockServer(services: any[]) {
  return { options: { services, auth: { jwtSecret: "test" } } } as any;
}

function createMockServerWithAuth(services: any[], authConfig: { jwtSecret: string } | false | undefined) {
  return { options: { services, auth: authConfig } } as any;
}

describe("executeServiceMethod with ServiceDefinition", () => {
  it("executes a basic service method", async () => {
    const EchoService = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const server = createMockServer([EchoService]);
    const result = await executeServiceMethod(server, {
      serviceName: "Echo",
      methodName: "echo",
      params: ["hello"],
    });

    expect(result).toBe("Echo: hello");
  });

  it("throws error when service not found", async () => {
    const server = createMockServer([]);

    await expect(
      executeServiceMethod(server, { serviceName: "Unknown", methodName: "test", params: [] }),
    ).rejects.toThrow("서비스 [Unknown]를 찾을 수 없습니다.");
  });

  it("throws error when method not found", async () => {
    const svc = defineService("Test", (_ctx) => ({
      existing: () => "ok",
    }));
    const server = createMockServer([svc]);

    await expect(
      executeServiceMethod(server, { serviceName: "Test", methodName: "nonexistent", params: [] }),
    ).rejects.toThrow("메서드 [Test.nonexistent]를 찾을 수 없습니다.");
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
      executeServiceMethod(server, { serviceName: "Protected", methodName: "secret", params: [] }),
    ).rejects.toThrow("로그인이 필요합니다.");
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
      executeServiceMethod(server, {
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
    const server = createMockServer([svc]);

    const result = await executeServiceMethod(server, {
      serviceName: "Admin",
      methodName: "manage",
      params: [],
      http: { clientName: "test", authTokenPayload: { roles: ["admin"], data: {} } },
    });

    expect(result).toBe("managed");
  });

  it("provides context to factory", async () => {
    const svc = defineService("Ctx", (ctx) => ({
      getClientName: () => ctx.clientName,
    }));
    const server = createMockServer([svc]);

    const result = await executeServiceMethod(server, {
      serviceName: "Ctx",
      methodName: "getClientName",
      params: [],
      http: { clientName: "my-app", authTokenPayload: undefined },
    });

    expect(result).toBe("my-app");
  });

  it("throws error when auth is undefined and auth-required service is called", async () => {
    const svc = defineService(
      "Protected",
      auth((_ctx) => ({
        secret: () => "secret",
      })),
    );
    const server = createMockServerWithAuth([svc], undefined);

    await expect(
      executeServiceMethod(server, { serviceName: "Protected", methodName: "secret", params: [] }),
    ).rejects.toThrow("auth 설정이 필요합니다");
  });

  it("skips auth check when auth is false", async () => {
    const svc = defineService(
      "Protected",
      auth((_ctx) => ({
        secret: () => "secret-value",
      })),
    );
    const server = createMockServerWithAuth([svc], false);

    const result = await executeServiceMethod(server, {
      serviceName: "Protected",
      methodName: "secret",
      params: [],
    });

    expect(result).toBe("secret-value");
  });

  it("skips role check when auth is false", async () => {
    const svc = defineService(
      "Admin",
      auth((_ctx) => ({
        manage: auth(["admin"], () => "managed"),
      })),
    );
    const server = createMockServerWithAuth([svc], false);

    const result = await executeServiceMethod(server, {
      serviceName: "Admin",
      methodName: "manage",
      params: [],
    });

    expect(result).toBe("managed");
  });
});
