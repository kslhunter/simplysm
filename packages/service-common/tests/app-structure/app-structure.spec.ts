import { describe, it, expect } from "vitest";
import {
  getFlatPermissions,
  isUsableModules,
  isUsableModulesChain,
} from "../../src/app-structure/app-structure.utils";
import type { AppStructureItem } from "../../src/app-structure/app-structure.types";

describe("Feature 1.1 Slice 1: service-common app-structure", () => {
  // 공통 테스트 데이터
  const items: AppStructureItem<string>[] = [
    {
      code: "admin",
      title: "관리",
      children: [
        { code: "user", title: "사용자", perms: ["use", "edit"] },
        { code: "config", title: "설정" },
      ],
    },
    {
      code: "report",
      title: "리포트",
      modules: ["moduleA"],
      perms: ["use"],
    },
    {
      code: "dashboard",
      title: "대시보드",
      requiredModules: ["moduleA", "moduleB"],
    },
    {
      code: "sales",
      title: "영업",
      modules: ["moduleA"],
      children: [
        {
          code: "order",
          title: "주문",
          perms: ["use", "edit"],
          subPerms: [
            { code: "export", title: "내보내기", perms: ["use"] },
            {
              code: "approve",
              title: "승인",
              modules: ["moduleC"],
              perms: ["use", "edit"],
            },
          ],
        },
      ],
    },
  ];

  describe("Rule: 공유 유틸은 standalone 함수로 service-common에 생성한다", () => {
    it("getFlatPermissions가 모듈 조건에 따라 flat permission을 반환한다", () => {
      const result = getFlatPermissions(items, ["moduleA"]);

      // admin.user의 use, edit
      expect(result).toContainEqual(
        expect.objectContaining({ codeChain: ["admin", "user", "use"] }),
      );
      expect(result).toContainEqual(
        expect.objectContaining({ codeChain: ["admin", "user", "edit"] }),
      );

      // report의 use (modules: ["moduleA"] → moduleA 활성이므로 포함)
      expect(result).toContainEqual(
        expect.objectContaining({ codeChain: ["report", "use"] }),
      );

      // dashboard는 requiredModules: ["moduleA", "moduleB"] → moduleB 미활성으로 제외
      expect(result).not.toContainEqual(
        expect.objectContaining({ codeChain: expect.arrayContaining(["dashboard"]) }),
      );

      // sales.order의 perms
      expect(result).toContainEqual(
        expect.objectContaining({ codeChain: ["sales", "order", "use"] }),
      );

      // sales.order.export subPerm (모듈 조건 없음 → 포함)
      expect(result).toContainEqual(
        expect.objectContaining({ codeChain: ["sales", "order", "export", "use"] }),
      );

      // sales.order.approve subPerm (modules: ["moduleC"] → 미활성으로 제외)
      expect(result).not.toContainEqual(
        expect.objectContaining({
          codeChain: expect.arrayContaining(["approve"]),
        }),
      );
    });

    it("isUsableModules OR 조건 (modules)", () => {
      expect(isUsableModules(["A", "B"], undefined, ["A"])).toBe(true);
    });

    it("isUsableModules AND 조건 (requiredModules)", () => {
      expect(isUsableModules(undefined, ["A", "B"], ["A"])).toBe(false);
    });

    it("isUsableModules 빈/미정의 modules", () => {
      expect(isUsableModules(undefined, undefined, ["A"])).toBe(true);
      expect(isUsableModules([], undefined, ["A"])).toBe(true);
    });

    it("isUsableModulesChain 체인 전체 체크 — 성공", () => {
      expect(isUsableModulesChain([["A"], ["B"]], [], ["A", "B"])).toBe(true);
    });

    it("isUsableModulesChain 체인 중 하나 실패", () => {
      expect(isUsableModulesChain([["A"], ["C"]], [], ["A", "B"])).toBe(false);
    });
  });
});
