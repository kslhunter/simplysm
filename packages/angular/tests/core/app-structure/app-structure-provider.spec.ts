import "@simplysm/core-browser";
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdAppStructureProvider,
  injectPermsSignal,
} from "../../../src/core/app-structure/sd-app-structure.provider";
import type { AppStructureItem } from "@simplysm/service-common";

const TEST_ITEMS: AppStructureItem<string>[] = [
  {
    code: "admin",
    title: "관리",
    icon: "admin-icon",
    children: [
      { code: "user", title: "사용자", perms: ["use", "edit"] },
      { code: "config", title: "설정" },
    ],
  },
  {
    code: "report",
    title: "리포트",
    modules: ["moduleA"],
  },
  {
    code: "hidden",
    title: "숨김",
    isNotMenu: true,
  },
  {
    code: "multi",
    title: "멀티모듈",
    requiredModules: ["moduleA", "moduleB"],
  },
  {
    code: "external",
    title: "외부링크",
    url: "https://example.com",
  },
];

describe("SdAppStructureProvider", () => {
  let structure: SdAppStructureProvider<string>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SdAppStructureProvider] });
    structure = TestBed.inject(SdAppStructureProvider) as SdAppStructureProvider<string>;
    structure.items.set(TEST_ITEMS);
  });

  describe("메뉴 계산", () => {
    it("그룹 메뉴에 하위 메뉴가 포함된다", () => {
      // permRecord에 admin.user.use를 설정하여 user가 표시되도록
      structure.permRecord.set({ "admin.user.use": true });
      const menus = structure.usableMenus();
      const adminMenu = menus.find((m) => m.codeChain[0] === "admin");
      expect(adminMenu).toBeDefined();
      expect(adminMenu!.children).toBeDefined();
      expect(adminMenu!.children!.some((c) => c.codeChain[1] === "user")).toBe(true);
    });

    it("modules 조건으로 메뉴를 필터링한다 (OR)", () => {
      structure.usableModules.set(["moduleA"]);
      const menus = structure.usableMenus();
      // report는 perms 없으므로 modules만 통과하면 표시됨
      expect(menus.some((m) => m.codeChain[0] === "report")).toBe(true);
    });

    it("modules 조건 미충족 시 메뉴에서 제외된다", () => {
      structure.usableModules.set(["moduleX"]);
      const menus = structure.usableMenus();
      expect(menus.some((m) => m.codeChain[0] === "report")).toBe(false);
    });

    it("requiredModules 조건으로 메뉴를 필터링한다 (AND)", () => {
      structure.usableModules.set(["moduleA"]);
      const menus = structure.usableMenus();
      // multi는 requiredModules [A, B]인데 A만 있으므로 제외
      expect(menus.some((m) => m.codeChain[0] === "multi")).toBe(false);
    });

    it("isNotMenu 항목은 메뉴에서 제외되고 권한에는 포함된다", () => {
      const menus = structure.usableMenus();
      expect(menus.some((m) => m.codeChain[0] === "hidden")).toBe(false);

      const perms = structure.getPermissionsByStructure(structure.items());
      expect(perms.some((p) => p.codeChain[0] === "hidden")).toBe(true);
    });

    it("perms가 있고 use 권한이 없으면 메뉴에서 제외된다", () => {
      structure.permRecord.set({});
      const menus = structure.usableMenus();
      const adminMenu = menus.find((m) => m.codeChain[0] === "admin");
      // user는 perms가 있고 permRecord에 use가 없으므로 제외
      expect(adminMenu!.children!.some((c) => c.codeChain[1] === "user")).toBe(false);
      // config는 perms가 없으므로 항상 표시
      expect(adminMenu!.children!.some((c) => c.codeChain[1] === "config")).toBe(true);
    });
  });

  describe("권한 조회", () => {
    it("injectPermsSignal로 활성 권한을 조회한다", () => {
      structure.permRecord.set({ "admin.user.edit": true });

      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.user"], ["use", "edit"]),
      );
      expect(result()).toEqual(["edit"]);
    });

    it("perms가 없는 항목은 모든 권한이 활성이다", () => {
      structure.permRecord.set({});

      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.config"], ["use", "edit"]),
      );
      expect(result()).toEqual(["use", "edit"]);
    });
  });

  describe("Feature 2.2: SdMenu url 전파", () => {
    it("url이 있는 LeafItem의 url이 메뉴에 전파된다", () => {
      const menus = structure.usableMenus();
      const externalMenu = menus.find((m) => m.codeChain[0] === "external");
      expect(externalMenu).toBeDefined();
      expect(externalMenu!.url).toBe("https://example.com");
    });

    it("url이 없는 LeafItem의 url은 undefined이다", () => {
      structure.usableModules.set(["moduleA"]);
      const menus = structure.usableMenus();
      const reportMenu = menus.find((m) => m.codeChain[0] === "report");
      expect(reportMenu).toBeDefined();
      expect(reportMenu!.url).toBeUndefined();
    });

    it("그룹 메뉴는 url이 없다", () => {
      structure.permRecord.set({ "admin.user.use": true });
      const menus = structure.usableMenus();
      const adminMenu = menus.find((m) => m.codeChain[0] === "admin");
      expect(adminMenu).toBeDefined();
      expect(adminMenu!.url).toBeUndefined();
    });
  });

  describe("Feature 2.2 Slice 1: getItemChainByFullCode 중간 코드 누락", () => {
    it("중간 코드가 items에 존재하지 않으면 빈 배열을 반환한다", () => {
      // "admin.nonexistent.something" — admin은 있지만 nonexistent는 없다
      const chain = structure.getItemChainByFullCode("admin.nonexistent.something");
      expect(chain).toEqual([]);
    });

    it("중간 코드 누락 시 getTitleByFullCode가 에러를 throw한다", () => {
      expect(() => structure.getTitleByFullCode("admin.nonexistent.something")).toThrow(
        "Item not found for fullCode: admin.nonexistent.something",
      );
    });

    it("중간 코드 누락 시 getPermsByFullCode가 빈 배열을 반환한다", () => {
      structure.permRecord.set({ "admin.user.use": true });
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.nonexistent.something"], ["use", "edit"]),
      );
      expect(result()).toEqual([]);
    });

    it("유효한 fullCode는 전체 체인을 반환한다", () => {
      const chain = structure.getItemChainByFullCode("admin.user");
      expect(chain.length).toBe(2);
      expect(chain[0].code).toBe("admin");
      expect(chain[1].code).toBe("user");
    });

    it("단일 코드는 1개 아이템 체인을 반환한다", () => {
      const chain = structure.getItemChainByFullCode("admin");
      expect(chain.length).toBe(1);
      expect(chain[0].code).toBe("admin");
    });
  });

  describe("Feature 2.2 Slice 2: getPermsByFullCode permRecord 미로딩 가드", () => {
    it("permRecord가 undefined이고 perms 미정의 항목이면 빈 배열을 반환한다", () => {
      // permRecord는 초기값 undefined (signal 초기 상태)
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.config"], ["use", "edit"]),
      );
      expect(result()).toEqual([]);
    });

    it("permRecord가 undefined이고 perms 정의 항목이면 빈 배열을 반환한다", () => {
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.user"], ["use", "edit"]),
      );
      expect(result()).toEqual([]);
    });

    it("permRecord 로딩 완료 후 기존 동작을 보존한다", () => {
      structure.permRecord.set({ "admin.user.use": true });
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.user"], ["use", "edit"]),
      );
      expect(result()).toEqual(["use"]);
    });
  });

  describe("Feature 1.3: items signal 및 initialize", () => {
    it("Provider 생성 직후 items는 빈 배열이다", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [SdAppStructureProvider] });
      const fresh = TestBed.inject(SdAppStructureProvider);
      expect(fresh.items()).toEqual([]);
    });

    it("initialize 후 주입한 items가 설정된다", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [SdAppStructureProvider] });
      const fresh = TestBed.inject(SdAppStructureProvider);

      fresh.initialize(TEST_ITEMS);

      expect(fresh.items()).toEqual(TEST_ITEMS);
    });

    it("initialize 전 usableMenus는 빈 배열이다", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [SdAppStructureProvider] });
      const fresh = TestBed.inject(SdAppStructureProvider);
      expect(fresh.usableMenus()).toEqual([]);
    });

    it("initialize 후 usableMenus가 items에 따라 계산된다", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [SdAppStructureProvider] });
      const fresh = TestBed.inject(SdAppStructureProvider) as SdAppStructureProvider<string>;

      fresh.initialize(TEST_ITEMS);
      fresh.usableModules.set(["moduleA"]);

      const menus = fresh.usableMenus();
      expect(menus.some((m) => m.codeChain[0] === "report")).toBe(true);
    });
  });

  describe("Feature 1.1: 경계값 안전 처리", () => {
    it("잘못된 fullCode로 getTitleByFullCode 호출 시 에러가 발생한다", () => {
      expect(() => structure.getTitleByFullCode("nonexistent.code")).toThrow(
        "Item not found for fullCode: nonexistent.code",
      );
    });

    it("잘못된 fullCode로 getPermsByFullCode 호출 시 빈 배열이 반환된다 (권한 거부)", () => {
      structure.permRecord.set({});
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["nonexistent.code"], ["use", "edit"]),
      );
      expect(result()).toEqual([]);
    });

    it("perms가 없는 item의 fullCode는 모든 권한이 부여된다 (기존 동작 유지)", () => {
      structure.permRecord.set({});
      const result = TestBed.runInInjectionContext(() =>
        injectPermsSignal(["admin.config"], ["use", "edit"]),
      );
      expect(result()).toEqual(["use", "edit"]);
    });
  });
});
