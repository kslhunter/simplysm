import { describe, it, expect } from "vitest";
import { type Accessor, createRoot, createSignal } from "solid-js";
import type { Component } from "solid-js";
import { createAppStructure, type AppStructureItem } from "../../src/helpers/createAppStructure";

// dummy components for tests
const DummyA: Component = () => null;
const DummyB: Component = () => null;
const DummyC: Component = () => null;
const DummyD: Component = () => null;

// common test structure
function createTestItems(): AppStructureItem<string>[] {
  return [
    {
      code: "home",
      title: "홈",
      children: [
        {
          code: "sales",
          title: "영업",
          modules: ["sales"],
          children: [
            {
              code: "invoice",
              title: "송장",
              component: DummyA,
              perms: ["use", "edit"] as ("use" | "edit")[],
            },
            {
              code: "order",
              title: "주문",
              component: DummyB,
              perms: ["use"] as ("use" | "edit")[],
              requiredModules: ["sales", "erp"],
            },
          ],
        },
        {
          code: "admin",
          title: "관리",
          children: [
            {
              code: "users",
              title: "사용자",
              component: DummyC,
            },
            {
              code: "hidden",
              title: "숨김",
              component: DummyD,
              isNotMenu: true,
            },
          ],
        },
      ],
    },
  ];
}

function buildTestStructure<const TItems extends AppStructureItem<string>[]>(opts: {
  items: TItems;
  permRecord?: Accessor<Record<string, boolean> | undefined>;
  usableModules?: Accessor<string[] | undefined>;
}) {
  const { AppStructureProvider, useAppStructure } = createAppStructure(() => opts);

  let result!: ReturnType<typeof useAppStructure>;
  AppStructureProvider({
    get children() {
      result = useAppStructure();
      return undefined;
    },
  });

  return result;
}

describe("createAppStructure", () => {
  it("returns AppStructureProvider and useAppStructure", () => {
    createRoot((dispose) => {
      const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "user",
                title: "사용자",
                component: DummyA,
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
      }));

      expect(AppStructureProvider).toBeTypeOf("function");
      expect(useAppStructure).toBeTypeOf("function");

      dispose();
    });
  });

  describe("usableRoutes", () => {
    it("includes paths and components for all leaf items", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        expect(result.usableRoutes()).toEqual([
          { path: "/sales/invoice", component: DummyA },
          { path: "/sales/order", component: DummyB },
          { path: "/admin/users", component: DummyC },
          { path: "/admin/hidden", component: DummyD },
        ]);

        dispose();
      });
    });

    it("excludes items without a component from usableRoutes", () => {
      createRoot((dispose) => {
        const items: AppStructureItem<string>[] = [
          {
            code: "home",
            title: "홈",
            children: [{ code: "about", title: "소개" }],
          },
        ];

        const result = buildTestStructure({ items });
        expect(result.usableRoutes()).toEqual([]);

        dispose();
      });
    });

    it("filters out modules not matching usableModules", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        // sales group has modules: ["sales"] — filtered out when only "erp" is present
        // admin has no modules — always included
        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual(["/admin/users", "/admin/hidden"]);

        dispose();
      });
    });

    it("filters out items when all requiredModules are missing", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        // order has requiredModules: ["sales", "erp"] — filtered because "erp" is missing
        // invoice has no requiredModules — included
        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual([
          "/sales/invoice",
          "/admin/users",
          "/admin/hidden",
        ]);

        dispose();
      });
    });

    it("filters out items without use permission in permRecord", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": true,
        });

        const result = buildTestStructure({
          items: createTestItems(),
          permRecord: perms,
        });

        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual([
          "/sales/order",
          "/admin/users",
          "/admin/hidden",
        ]);

        dispose();
      });
    });

    it("includes only items satisfying both module and perm requirements", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales", "erp"]);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": false,
        });

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual([
          "/sales/invoice",
          "/admin/users",
          "/admin/hidden",
        ]);

        dispose();
      });
    });

    it("includes isNotMenu items in routes", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        const routes = result.usableRoutes();
        expect(routes.find((r) => r.path === "/admin/hidden")).toBeDefined();

        dispose();
      });
    });
  });

  describe("allFlatPerms", () => {
    it("collects requiredModulesChain per hierarchy level", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        // order has requiredModules: ["sales", "erp"]
        // parent sales has modules: ["sales"] (not requiredModules)
        const orderUsePerm = result.allFlatPerms.find((p) => p.code === "/home/sales/order/use");
        expect(orderUsePerm).toBeDefined();
        expect(orderUsePerm!.modulesChain).toEqual([["sales"]]);
        expect(orderUsePerm!.requiredModulesChain).toEqual([["sales", "erp"]]);

        // invoice has no requiredModules
        const invoiceUsePerm = result.allFlatPerms.find(
          (p) => p.code === "/home/sales/invoice/use",
        );
        expect(invoiceUsePerm).toBeDefined();
        expect(invoiceUsePerm!.modulesChain).toEqual([["sales"]]);
        expect(invoiceUsePerm!.requiredModulesChain).toEqual([]);

        dispose();
      });
    });
  });

  describe("usableMenus", () => {
    it("hides leaves with perms and shows only perms-less leaves when permRecord is absent", () => {
      // permRecord defaults to {}, so items with "use" in perms are
      // filtered because permRecord[href + "/use"] is undefined (falsy)
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });
        const menus = result.usableMenus();

        // sales sub-items (invoice, order) both have "use" in perms → hidden
        // → sales group itself is also hidden because no children remain
        // admin sub-items: only 사용자 (no perms) shown, 숨김 (isNotMenu) excluded
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("displays all menus except isNotMenu when all permissions are granted", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();

        expect(menus).toHaveLength(2);
        expect(menus[0].title).toBe("영업");
        expect(menus[0].children).toHaveLength(2);
        expect(menus[1].title).toBe("관리");
        expect(menus[1].children).toHaveLength(1);
        expect(menus[1].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("generates href as the correct full path", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();

        expect(menus[0].children![0].href).toBe("/home/sales/invoice");
        expect(menus[1].children![0].href).toBe("/home/admin/users");

        dispose();
      });
    });

    it("modules OR filter: group is hidden when its module is not in usableModules", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        const menus = result.usableMenus();
        // sales group has modules: ["sales"] but "sales" is not in usableModules → hidden
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("requiredModules AND filter: displayed only when all required modules are present", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales"]);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // sales group matches modules: ["sales"] → shown
        // order has requiredModules: ["sales", "erp"] but "erp" is missing → hidden
        // invoice has no requiredModules → shown
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("송장");

        dispose();
      });
    });

    it("permRecord filter: hidden when use permission is absent", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("주문");

        dispose();
      });
    });

    it("leaves without perms are always shown without permission check", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({});

        const result = buildTestStructure({
          items: createTestItems(),
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // permRecord is empty → all items with perms: ["use"] are hidden
        // only 사용자 (DummyC, no perms) is shown
        // only 관리 group remains (index 0)
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");
        expect(menus[0].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("hides group when all children are filtered out", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": false,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // all sales sub-items filtered out by missing permissions → sales group is also hidden
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("menus are recalculated when usableModules changes", () => {
      createRoot((dispose) => {
        const [modules, setModules] = createSignal<string[] | undefined>(undefined);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        // usableModules is undefined → no module filtering → all shown
        expect(result.usableMenus()).toHaveLength(2);

        // setting usableModules to ["sales"] fails order's requiredModules
        setModules(["sales"]);
        expect(result.usableMenus()[0].title).toBe("영업");
        expect(result.usableMenus()[0].children).toHaveLength(1);
        expect(result.usableMenus()[0].children![0].title).toBe("송장");

        dispose();
      });
    });
  });

  describe("usableFlatMenus", () => {
    it("flattens the tree and returns titleChain and href", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = buildTestStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const flat = result.usableFlatMenus();

        expect(flat).toContainEqual({
          titleChain: ["영업", "송장"],
          href: "/home/sales/invoice",
        });
        expect(flat).toContainEqual({
          titleChain: ["관리", "사용자"],
          href: "/home/admin/users",
        });

        dispose();
      });
    });
  });

  describe("getTitleChainByHref", () => {
    it("returns title chain from href", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/sales/invoice")).toEqual(["홈", "영업", "송장"]);
        expect(result.getTitleChainByHref("/home/admin/users")).toEqual(["홈", "관리", "사용자"]);

        dispose();
      });
    });

    it("also finds isNotMenu items", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/admin/hidden")).toEqual(["홈", "관리", "숨김"]);

        dispose();
      });
    });

    it("returns empty array for nonexistent href", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/nonexistent")).toEqual(["홈"]);
        expect(result.getTitleChainByHref("/totally/wrong")).toEqual([]);

        dispose();
      });
    });
  });

  describe("usablePerms", () => {
    it("excludes leaves without perms from usablePerms", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                { code: "main", title: "메인" },
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        const perms = result.usablePerms();
        // home group's children should not include "메인"
        const homeGroup = perms[0];
        expect(homeGroup.children).toHaveLength(1);
        expect(homeGroup.children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("excludes leaves with empty perms array", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "empty",
                  title: "빈perms",
                  perms: [] as ("use" | "edit")[],
                },
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        const perms = result.usablePerms();
        const homeGroup = perms[0];
        expect(homeGroup.children).toHaveLength(1);
        expect(homeGroup.children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("excludes group when all children are filtered out", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "empty-group",
                  title: "빈그룹",
                  children: [{ code: "about", title: "소개" }],
                },
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        const perms = result.usablePerms();
        const homeGroup = perms[0];
        expect(homeGroup.children).toHaveLength(1);
        expect(homeGroup.children![0].title).toBe("사용자");

        dispose();
      });
    });
  });

  describe("perms", () => {
    it("returns true for perms that are true in permRecord", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/invoice/edit": false,
        });

        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "sales",
                  title: "영업",
                  children: [
                    {
                      code: "invoice",
                      title: "송장",
                      perms: ["use", "edit"] as ("use" | "edit")[],
                    },
                  ],
                },
              ],
            },
          ],
          permRecord: perms,
        });

        expect(result.perms.home.sales.invoice.use).toBe(true);
        expect(result.perms.home.sales.invoice.edit).toBe(false);

        dispose();
      });
    });

    it("returns false for perms absent from permRecord", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({});

        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
          permRecord: perms,
        });

        expect(result.perms.home.user.use).toBe(false);

        dispose();
      });
    });

    it("all perms are false when permRecord is absent", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        expect(result.perms.home.user.use).toBe(false);

        dispose();
      });
    });

    it("subPerms are accessible in the same way", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/user/auth/use": true,
        });

        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use", "edit"] as ("use" | "edit")[],
                  subPerms: [{ code: "auth", title: "권한", perms: ["use"] as ("use" | "edit")[] }],
                },
              ],
            },
          ],
          permRecord: perms,
        });

        expect(result.perms.home.user.auth.use).toBe(true);

        dispose();
      });
    });

    it("perm values update reactively when permRecord changes", () => {
      createRoot((dispose) => {
        const [perms, setPerms] = createSignal<Record<string, boolean>>({
          "/home/user/use": false,
        });

        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
          permRecord: perms,
        });

        expect(result.perms.home.user.use).toBe(false);

        setPerms({ "/home/user/use": true });
        expect(result.perms.home.user.use).toBe(true);

        dispose();
      });
    });

    it("excludes leaves without perms from the perms tree", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                { code: "main", title: "메인" },
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        expect(result.perms.home.user).toBeDefined();
        expect((result.perms.home as Record<string, unknown>)["main"]).toBeUndefined();

        dispose();
      });
    });

    it("excludes groups without any perm from the perms tree", () => {
      createRoot((dispose) => {
        const result = buildTestStructure({
          items: [
            {
              code: "home",
              title: "홈",
              children: [
                {
                  code: "empty-group",
                  title: "빈그룹",
                  children: [{ code: "about", title: "소개" }],
                },
                {
                  code: "user",
                  title: "사용자",
                  perms: ["use"] as ("use" | "edit")[],
                },
              ],
            },
          ],
        });

        expect(result.perms.home.user).toBeDefined();
        expect((result.perms.home as Record<string, unknown>)["empty-group"]).toBeUndefined();

        dispose();
      });
    });
  });
});
