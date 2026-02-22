import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import type { Component } from "solid-js";
import { createAppStructure, type AppStructureItem } from "../../src/helpers/createAppStructure";

// 테스트용 더미 컴포넌트
const DummyA: Component = () => null;
const DummyB: Component = () => null;
const DummyC: Component = () => null;
const DummyD: Component = () => null;

// 공통 테스트 구조
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

describe("createAppStructure", () => {
  it("AppStructureProvider와 useAppStructure를 반환한다", () => {
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
    it("모든 리프 아이템의 경로와 컴포넌트를 포함한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        expect(result.usableRoutes()).toEqual([
          { path: "/sales/invoice", component: DummyA },
          { path: "/sales/order", component: DummyB },
          { path: "/admin/users", component: DummyC },
          { path: "/admin/hidden", component: DummyD },
        ]);

        dispose();
      });
    });

    it("component가 없는 아이템은 usableRoutes에 포함되지 않는다", () => {
      createRoot((dispose) => {
        const items: AppStructureItem<string>[] = [
          {
            code: "home",
            title: "홈",
            children: [{ code: "about", title: "소개" }],
          },
        ];

        const result = createAppStructure({ items });
        expect(result.usableRoutes()).toEqual([]);

        dispose();
      });
    });

    it("usableModules에 매칭되지 않는 모듈은 필터링된다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        // sales 그룹은 modules: ["sales"] — "erp"만 있으면 필터링됨
        // admin은 modules 없음 — 항상 포함
        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual(["/admin/users", "/admin/hidden"]);

        dispose();
      });
    });

    it("requiredModules가 모두 없으면 필터링된다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        // order는 requiredModules: ["sales", "erp"] — "erp"가 없으므로 필터링됨
        // invoice는 requiredModules 없음 — 포함
        const routes = result.usableRoutes();
        expect(routes.map((r) => r.path)).toEqual([
          "/sales/invoice",
          "/admin/users",
          "/admin/hidden",
        ]);

        dispose();
      });
    });

    it("permRecord에서 use 권한이 없으면 필터링된다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": true,
        });

        const result = createAppStructure({
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

    it("module과 perm 모두 충족해야 포함된다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales", "erp"]);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": false,
        });

        const result = createAppStructure({
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

    it("isNotMenu 아이템도 route에 포함된다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        const routes = result.usableRoutes();
        expect(routes.find((r) => r.path === "/admin/hidden")).toBeDefined();

        dispose();
      });
    });
  });

  describe("allFlatPerms", () => {
    it("requiredModulesChain을 계층별로 수집한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        // order는 requiredModules: ["sales", "erp"]
        // 부모 sales는 modules: ["sales"] (requiredModules 아님)
        const orderUsePerm = result.allFlatPerms.find((p) => p.code === "/home/sales/order/use");
        expect(orderUsePerm).toBeDefined();
        expect(orderUsePerm!.modulesChain).toEqual([["sales"]]);
        expect(orderUsePerm!.requiredModulesChain).toEqual([["sales", "erp"]]);

        // invoice는 requiredModules 없음
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
    it("permRecord가 없으면 perms가 있는 리프는 숨겨지고 perms가 없는 리프만 표시된다", () => {
      // permRecord 기본값이 {}이므로, perms에 "use"가 있는 아이템은
      // permRecord[href + "/use"]가 undefined(falsy)가 되어 필터링됨
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });
        const menus = result.usableMenus();

        // 영업 하위 아이템(송장, 주문)은 모두 perms에 "use"가 있어 숨겨짐
        // → 영업 그룹 자체도 자식이 없으므로 숨겨짐
        // 관리 하위 아이템: 사용자(perms 없음)만 표시, 숨김(isNotMenu)은 제외
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("모든 권한이 부여되면 isNotMenu를 제외한 모든 메뉴가 표시된다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
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

    it("href가 올바른 전체 경로로 생성된다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
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

    it("modules OR 필터링: 모듈이 없으면 해당 그룹이 숨겨진다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
        });

        const menus = result.usableMenus();
        // sales 그룹은 modules: ["sales"]인데 usableModules에 "sales"가 없으므로 숨겨짐
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("requiredModules AND 필터링: 모든 모듈이 있어야 표시된다", () => {
      createRoot((dispose) => {
        const [modules] = createSignal<string[]>(["sales"]);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // sales 그룹은 modules: ["sales"]에 매칭되어 표시됨
        // order는 requiredModules: ["sales", "erp"]인데 "erp"가 없으므로 숨겨짐
        // invoice는 requiredModules가 없으므로 표시됨
        expect(menus[0].children).toHaveLength(1);
        expect(menus[0].children![0].title).toBe("송장");

        dispose();
      });
    });

    it("permRecord 필터링: use 권한이 없으면 숨겨진다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
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

    it("perms가 없는 리프는 권한 체크 없이 항상 표시된다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({});

        const result = createAppStructure({
          items: createTestItems(),
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // permRecord가 빈 객체이므로 perms: ["use"]가 있는 아이템은 모두 숨겨짐
        // perms가 없는 사용자(DummyC)만 표시됨
        // 관리 그룹만 남음 (인덱스 0)
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");
        expect(menus[0].children![0].title).toBe("사용자");

        dispose();
      });
    });

    it("자식이 모두 필터링되면 그룹도 숨겨진다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": false,
          "/home/sales/order/use": false,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        const menus = result.usableMenus();
        // 영업 하위 아이템이 모두 권한 없음으로 필터링 → 영업 그룹도 숨겨짐
        expect(menus).toHaveLength(1);
        expect(menus[0].title).toBe("관리");

        dispose();
      });
    });

    it("usableModules가 변경되면 메뉴가 재계산된다", () => {
      createRoot((dispose) => {
        const [modules, setModules] = createSignal<string[] | undefined>(undefined);
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const result = createAppStructure({
          items: createTestItems(),
          usableModules: modules,
          permRecord: perms,
        });

        // usableModules가 undefined이면 모듈 필터링 없음 → 전부 표시
        expect(result.usableMenus()).toHaveLength(2);

        // usableModules를 ["sales"]로 설정하면 order의 requiredModules 불충족
        setModules(["sales"]);
        expect(result.usableMenus()[0].title).toBe("영업");
        expect(result.usableMenus()[0].children).toHaveLength(1);
        expect(result.usableMenus()[0].children![0].title).toBe("송장");

        dispose();
      });
    });
  });

  describe("usableFlatMenus", () => {
    it("트리를 평탄화하여 titleChain과 href를 반환한다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/order/use": true,
        });

        const [modules] = createSignal<string[]>(["sales", "erp"]);

        const result = createAppStructure({
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
    it("href에서 title 체인을 반환한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/sales/invoice")).toEqual(["홈", "영업", "송장"]);
        expect(result.getTitleChainByHref("/home/admin/users")).toEqual(["홈", "관리", "사용자"]);

        dispose();
      });
    });

    it("isNotMenu 아이템도 찾는다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/admin/hidden")).toEqual(["홈", "관리", "숨김"]);

        dispose();
      });
    });

    it("존재하지 않는 href는 빈 배열을 반환한다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({ items: createTestItems() });

        expect(result.getTitleChainByHref("/home/nonexistent")).toEqual(["홈"]);
        expect(result.getTitleChainByHref("/totally/wrong")).toEqual([]);

        dispose();
      });
    });
  });

  describe("perms", () => {
    it("permRecord에서 true인 perm은 true를 반환한다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/sales/invoice/use": true,
          "/home/sales/invoice/edit": false,
        });

        const result = createAppStructure({
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

    it("permRecord에 없는 perm은 false를 반환한다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({});

        const result = createAppStructure({
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

    it("permRecord가 없으면 모든 perm이 false다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({
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

    it("subPerms에도 동일하게 접근할 수 있다", () => {
      createRoot((dispose) => {
        const [perms] = createSignal<Record<string, boolean>>({
          "/home/user/auth/use": true,
        });

        const result = createAppStructure({
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

    it("permRecord 변경 시 perm 값이 반응적으로 업데이트된다", () => {
      createRoot((dispose) => {
        const [perms, setPerms] = createSignal<Record<string, boolean>>({
          "/home/user/use": false,
        });

        const result = createAppStructure({
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

    it("perms가 없는 leaf는 perms 트리에서 제외된다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({
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

    it("하위에 perm이 없는 group은 perms 트리에서 제외된다", () => {
      createRoot((dispose) => {
        const result = createAppStructure({
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
