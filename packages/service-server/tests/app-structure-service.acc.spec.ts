import { describe, it, expect } from "vitest";
import type { AppStructureItem } from "@simplysm/service-common";
import { AppStructureService } from "@simplysm/service-server";

describe("AppStructureService", () => {
  it("creates service definition and getItems returns full itemsMap", () => {
    const itemsMap: Record<string, AppStructureItem[]> = {
      client1: [
        { code: "dashboard", title: "대시보드", perms: ["use"] },
        { code: "settings", title: "설정", perms: ["use", "edit"] },
      ],
      client2: [{ code: "report", title: "리포트", perms: ["use"] }],
    };

    const svc = AppStructureService(itemsMap);

    expect(svc.name).toBe("AppStructure");
    expect(typeof svc.factory).toBe("function");

    const methods = svc.factory({} as any);
    const result = methods.getItems();

    expect(result).toEqual(itemsMap);
    expect(Object.keys(result)).toEqual(["client1", "client2"]);
    expect(result["client1"]).toHaveLength(2);
    expect(result["client2"]).toHaveLength(1);
  });

  it("returns empty object when itemsMap is empty", () => {
    const svc = AppStructureService({});
    const methods = svc.factory({} as any);

    expect(methods.getItems()).toEqual({});
  });

  it("has no auth permissions", () => {
    const svc = AppStructureService({});

    expect(svc.authPermissions).toBeUndefined();
  });
});
