import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import {
  PermissionTable,
  collectAllPerms,
  filterByModules,
  changePermCheck,
} from "../../../../src/components/features/permission-table/PermissionTable";
import type { AppPerm } from "../../../../src/helpers/createAppStructure";

// --- 테스트 데이터 ---

const sampleItems: AppPerm[] = [
  {
    title: "사용자 관리",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "권한 설정", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "사용자 목록", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "시스템",
    href: "/system",
    perms: ["use"],
    modules: ["admin"],
  },
];

// =====================
// Part 1: 유틸리티 함수 테스트
// =====================

describe("collectAllPerms", () => {
  it("트리에서 모든 고유 perm 타입을 수집한다", () => {
    const result = collectAllPerms(sampleItems);
    expect(result).toContain("use");
    expect(result).toContain("edit");
    expect(result).toContain("approve");
    expect(result).toHaveLength(3);
  });

  it("빈 배열은 빈 결과를 반환한다", () => {
    const result = collectAllPerms([]);
    expect(result).toEqual([]);
  });

  it("중첩된 아이템의 perms도 수집한다", () => {
    const items: AppPerm[] = [
      {
        title: "루트",
        children: [
          {
            title: "자식",
            href: "/child",
            perms: ["view"],
            children: [{ title: "손자", href: "/child/grandchild", perms: ["view", "delete"] }],
          },
        ],
      },
    ];
    const result = collectAllPerms(items);
    expect(result).toContain("view");
    expect(result).toContain("delete");
    expect(result).toHaveLength(2);
  });
});

describe("filterByModules", () => {
  it("modules가 undefined이면 모든 아이템을 반환한다", () => {
    const result = filterByModules(sampleItems, undefined);
    expect(result).toBe(sampleItems);
  });

  it("활성 모듈과 교차가 없는 아이템을 제외한다", () => {
    const result = filterByModules(sampleItems, ["other"]);
    // "시스템"은 modules: ["admin"]이므로 "other"와 교차 없음 → 제외
    const titles = result.map((i) => i.title);
    expect(titles).toContain("사용자 관리");
    expect(titles).not.toContain("시스템");
  });

  it("modules가 없는 아이템은 항상 포함된다", () => {
    const result = filterByModules(sampleItems, ["admin"]);
    // "사용자 관리"는 modules 미설정 → 항상 포함
    const titles = result.map((i) => i.title);
    expect(titles).toContain("사용자 관리");
    expect(titles).toContain("시스템");
  });

  it("자식이 전부 필터링된 그룹 노드(perms 없음)도 제거된다", () => {
    const items: AppPerm[] = [
      {
        title: "그룹",
        // perms 없음 → 그룹 노드
        children: [
          { title: "항목A", href: "/a", perms: ["use"], modules: ["admin"] },
          { title: "항목B", href: "/b", perms: ["use"], modules: ["admin"] },
        ],
      },
    ];
    const result = filterByModules(items, ["other"]);
    expect(result).toHaveLength(0);
  });
});

describe("changePermCheck", () => {
  it("리프 아이템에 perm을 설정한다", () => {
    const result = changePermCheck({}, sampleItems[1], "use", true);
    expect(result["/system/use"]).toBe(true);
  });

  it("부모 체크 시 모든 자식이 체크된다 (cascading down)", () => {
    const result = changePermCheck({}, sampleItems[0], "use", true);
    expect(result["/user/use"]).toBe(true);
    expect(result["/user/permission/use"]).toBe(true);
    expect(result["/user/list/use"]).toBe(true);
  });

  it("부모 체크 해제 시 모든 자식이 해제된다 (cascading down)", () => {
    const initial: Record<string, boolean> = {
      "/user/use": true,
      "/user/permission/use": true,
      "/user/list/use": true,
    };
    const result = changePermCheck(initial, sampleItems[0], "use", false);
    expect(result["/user/use"]).toBe(false);
    expect(result["/user/permission/use"]).toBe(false);
    expect(result["/user/list/use"]).toBe(false);
  });

  it("기본 perm(perms[0]) 해제 시 나머지 perms도 해제된다", () => {
    const initial: Record<string, boolean> = {
      "/user/use": true,
      "/user/edit": true,
      "/user/permission/use": true,
      "/user/permission/edit": true,
      "/user/permission/approve": true,
      "/user/list/use": true,
      "/user/list/edit": true,
    };
    const result = changePermCheck(initial, sampleItems[0], "use", false);
    // 기본 perm "use" 해제 → "edit", "approve"도 해제
    expect(result["/user/edit"]).toBe(false);
    expect(result["/user/permission/edit"]).toBe(false);
    expect(result["/user/permission/approve"]).toBe(false);
    expect(result["/user/list/edit"]).toBe(false);
  });

  it("비기본 perm 체크 시 기본 perm이 꺼져있으면 해당 아이템은 건너뛰고 자식에 cascading된다", () => {
    // 부모(/user)의 기본 perm "use"가 꺼져있으나, 자식들의 "use"는 켜져있음
    const initial: Record<string, boolean> = {
      "/user/permission/use": true,
      "/user/list/use": true,
    };
    const result = changePermCheck(initial, sampleItems[0], "edit", true);
    // 부모(/user): use가 꺼져있으므로 edit 설정 건너뜀
    expect(result["/user/edit"]).toBeUndefined();
    // 자식: use가 켜져있으므로 edit 설정됨
    expect(result["/user/permission/edit"]).toBe(true);
    expect(result["/user/list/edit"]).toBe(true);
  });
});

// =====================
// Part 2: 컴포넌트 렌더링 테스트
// =====================

describe("PermissionTable 컴포넌트", () => {
  describe("basic rendering", () => {
    it("data-permission-table 속성이 있는 div로 렌더링된다", () => {
      const { container } = render(() => <PermissionTable items={sampleItems} />);
      const wrapper = container.querySelector("[data-permission-table]");
      expect(wrapper).toBeTruthy();
      expect(wrapper!.tagName).toBe("DIV");
    });

    it("내부에 DataSheet(table)가 렌더링된다", () => {
      const { container } = render(() => <PermissionTable items={sampleItems} />);
      const table = container.querySelector("[data-sheet] table");
      expect(table).toBeTruthy();
    });

    it("헤더에 perm 타입 컬럼이 표시된다", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("use")).toBeTruthy();
      expect(getByText("edit")).toBeTruthy();
      expect(getByText("approve")).toBeTruthy();
    });

    it("아이템 타이틀이 표시된다", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("사용자 관리")).toBeTruthy();
      expect(getByText("시스템")).toBeTruthy();
    });

    it("자식 아이템이 기본적으로 펼쳐져서 표시된다", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("권한 설정")).toBeTruthy();
      expect(getByText("사용자 목록")).toBeTruthy();
    });
  });

  describe("체크박스 인터랙션", () => {
    it("체크박스 클릭 시 onValueChange가 호출된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <PermissionTable items={sampleItems} value={{}} onValueChange={handleChange} />
      ));

      const checkboxes = getAllByRole("checkbox");
      // 첫 번째 체크박스를 클릭
      fireEvent.click(checkboxes[0]);
      expect(handleChange).toHaveBeenCalled();
    });

    it("controlled 패턴: value prop이 체크박스에 반영된다", () => {
      const [value, setValue] = createSignal<Record<string, boolean>>({
        "/system/use": true,
      });

      const { getAllByRole } = render(() => (
        <PermissionTable items={[sampleItems[1]]} value={value()} onValueChange={setValue} />
      ));

      const checkboxes = getAllByRole("checkbox");
      // "시스템"의 "use" 체크박스가 체크되어 있어야 함
      const checkedBox = checkboxes.find((cb) => cb.getAttribute("aria-checked") === "true");
      expect(checkedBox).toBeTruthy();
    });
  });

  describe("접기/펼치기", () => {
    it("자식이 있는 아이템의 행에 펼치기/접기 토글이 존재한다", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      // "사용자 관리"가 있는 행(tr)을 찾고, 그 행에 expand toggle button이 있는지 확인
      const titleEl = getByText("사용자 관리");
      const row = titleEl.closest("tr")!;
      const expandButton = row.querySelector("button");
      expect(expandButton).toBeTruthy();
    });

    it("접기 버튼 클릭 시 자식이 DOM에서 제거된다", () => {
      const { getByText, queryByText } = render(() => <PermissionTable items={sampleItems} />);

      // 초기: 자식 표시 (기본적으로 모두 펼침)
      expect(getByText("권한 설정")).toBeTruthy();
      expect(getByText("사용자 목록")).toBeTruthy();

      // 접기 버튼 클릭 (사용자 관리 행의 expand toggle)
      const titleEl = getByText("사용자 관리");
      const row = titleEl.closest("tr")!;
      const expandButton = row.querySelector("button")!;
      fireEvent.click(expandButton);

      // 자식이 DOM에서 제거됨 (Sheet는 접힌 항목을 렌더링하지 않음)
      expect(queryByText("권한 설정")).toBeNull();
      expect(queryByText("사용자 목록")).toBeNull();
    });
  });

  describe("비활성화", () => {
    it("disabled prop이 true이면 체크박스 클릭이 무시된다", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <PermissionTable items={sampleItems} value={{}} onValueChange={handleChange} disabled />
      ));

      const checkboxes = getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      for (const cb of checkboxes) {
        fireEvent.click(cb);
      }
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
