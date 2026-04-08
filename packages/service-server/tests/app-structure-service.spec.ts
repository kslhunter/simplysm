import { describe, it, expect } from "vitest";
import type { AppStructureItem } from "@simplysm/service-common";
import { AppStructureService } from "@simplysm/service-server";

describe("AppStructureService", () => {
  it("returns same itemsMap reference (no cloning)", () => {
    const itemsMap: Record<string, AppStructureItem[]> = {
      app: [{ code: "home", title: "홈", perms: ["use"] }],
    };

    const svc = AppStructureService(itemsMap);
    const methods = svc.factory({} as any);

    expect(methods.getItems()).toBe(itemsMap);
  });

  it("each factory call returns the same itemsMap", () => {
    const itemsMap: Record<string, AppStructureItem[]> = {
      app: [{ code: "home", title: "홈", perms: ["use"] }],
    };

    const svc = AppStructureService(itemsMap);
    const methods1 = svc.factory({} as any);
    const methods2 = svc.factory({} as any);

    expect(methods1.getItems()).toBe(methods2.getItems());
  });
});
