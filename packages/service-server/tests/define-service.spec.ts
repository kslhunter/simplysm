import { describe, it, expect } from "vitest";
import { defineService, auth, getServiceAuthPermissions } from "@simplysm/service-server";

describe("defineService", () => {
  it("이름과 팩토리로 서비스 정의 생성", () => {
    const svc = defineService("Health", (_ctx) => ({
      check: () => "ok",
    }));

    expect(svc.name).toBe("Health");
    expect(typeof svc.factory).toBe("function");
  });

  it("ctx로 호출할 때 팩토리가 메서드 생성", () => {
    const svc = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const methods = svc.factory({} as any);
    expect(methods.echo("hello")).toBe("Echo: hello");
  });
});

describe("인증", () => {
  it("빈 권한으로 함수 표시 (로그인만)", () => {
    const fn = auth(() => "result");
    expect(getServiceAuthPermissions(fn)).toEqual([]);
    expect(fn()).toBe("result");
  });

  it("특정 권한으로 함수 표시", () => {
    const fn = auth(["admin"], (id: number) => id * 2);
    expect(getServiceAuthPermissions(fn)).toEqual(["admin"]);
    expect(fn(5)).toBe(10);
  });

  it("표시되지 않은 함수에 대해 undefined 반환", () => {
    const fn = () => "plain";
    expect(getServiceAuthPermissions(fn)).toBeUndefined();
  });

  it("서비스 레벨에서 작동 (팩토리 래핑)", () => {
    const svc = defineService(
      "User",
      auth((_ctx) => ({
        getProfile: () => "profile",
      })),
    );

    expect(svc.authPermissions).toEqual([]);
  });

  it("works at service-level with roles", () => {
    const svc = defineService(
      "Admin",
      auth(["admin"], (_ctx) => ({
        manage: () => "managed",
      })),
    );

    expect(svc.authPermissions).toEqual(["admin"]);
  });

  it("service without auth has no authPermissions", () => {
    const svc = defineService("Public", (_ctx) => ({
      open: () => "open",
    }));

    expect(svc.authPermissions).toBeUndefined();
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
