import { describe, it, expect } from "vitest";
import { defineService, auth, getServiceAuthPermissions } from "@simplysm/service-server";

describe("defineService", () => {
  it("creates service definition with name and factory", () => {
    const svc = defineService("Health", (_ctx) => ({
      check: () => "ok",
    }));

    expect(svc.name).toBe("Health");
    expect(svc.names).toEqual(["Health"]);
    expect(typeof svc.factory).toBe("function");
  });

  it("creates service definition with multiple names", () => {
    const svc = defineService(["Auth", "AuthService"], (_ctx) => ({
      signIn: () => "ok",
    }));

    expect(svc.name).toBe("Auth");
    expect(svc.names).toEqual(["Auth", "AuthService"]);
  });

  it("throws error when no service name is provided", () => {
    expect(() =>
      defineService([], (_ctx) => ({
        check: () => "ok",
      })),
    ).toThrow("서비스 이름은 하나 이상 필요합니다.");
  });

  it("factory generates methods when called with context", () => {
    const svc = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const methods = svc.factory({} as any);
    expect(methods.echo("hello")).toBe("Echo: hello");
  });
});

describe("인증", () => {
  it("marks function with empty permissions (login required only)", () => {
    const fn = auth(() => "result");
    expect(getServiceAuthPermissions(fn)).toEqual([]);
    expect(fn()).toBe("result");
  });

  it("marks function with specific permissions", () => {
    const fn = auth(["admin"], (id: number) => id * 2);
    expect(getServiceAuthPermissions(fn)).toEqual(["admin"]);
    expect(fn(5)).toBe(10);
  });

  it("returns undefined for unmarked function", () => {
    const fn = () => "plain";
    expect(getServiceAuthPermissions(fn)).toBeUndefined();
  });

  it("works at service level (factory wrapping)", () => {
    const svc = defineService(
      "User",
      auth((_ctx) => ({
        getProfile: () => "profile",
      })),
    );

    expect(svc.authPermissions).toEqual([]);
  });

  it("method-level auth is readable from returned methods", () => {
    const svc = defineService(
      "Mixed",
      auth((_ctx) => ({
        normal: () => "normal",
        adminOnly: auth(["admin"], () => "admin"),
      })),
    );

    const methods = svc.factory({} as any);
    expect(getServiceAuthPermissions(methods.normal)).toBeUndefined();
    expect(getServiceAuthPermissions(methods.adminOnly)).toEqual(["admin"]);
  });
});
