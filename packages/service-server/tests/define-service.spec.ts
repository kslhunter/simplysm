import { describe, it, expect } from "vitest";
import { defineService, auth, getServiceAuthPermissions } from "@simplysm/service-server";

describe("defineService", () => {
  it("creates a service definition with name and factory", () => {
    const svc = defineService("Health", (_ctx) => ({
      check: () => "ok",
    }));

    expect(svc.name).toBe("Health");
    expect(typeof svc.factory).toBe("function");
  });

  it("factory produces methods when called with ctx", () => {
    const svc = defineService("Echo", (_ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const methods = svc.factory({} as any);
    expect(methods.echo("hello")).toBe("Echo: hello");
  });
});

describe("auth", () => {
  it("marks a function with empty permissions (login only)", () => {
    const fn = auth(() => "result");
    expect(getServiceAuthPermissions(fn)).toEqual([]);
    expect(fn()).toBe("result");
  });

  it("marks a function with specific permissions", () => {
    const fn = auth(["admin"], (id: number) => id * 2);
    expect(getServiceAuthPermissions(fn)).toEqual(["admin"]);
    expect(fn(5)).toBe(10);
  });

  it("returns undefined for unmarked functions", () => {
    const fn = () => "plain";
    expect(getServiceAuthPermissions(fn)).toBeUndefined();
  });

  it("works at service-level (wrapping factory)", () => {
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
