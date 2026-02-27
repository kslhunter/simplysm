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
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// --- test data ---

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
// Part 1: utility function tests
// =====================

describe("collectAllPerms", () => {
  it("collects all unique perm types from the tree", () => {
    const result = collectAllPerms(sampleItems);
    expect(result).toContain("use");
    expect(result).toContain("edit");
    expect(result).toContain("approve");
    expect(result).toHaveLength(3);
  });

  it("returns empty result for empty array", () => {
    const result = collectAllPerms([]);
    expect(result).toEqual([]);
  });

  it("collects perms from nested items", () => {
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
  it("returns all items when modules is undefined", () => {
    const result = filterByModules(sampleItems, undefined);
    expect(result).toBe(sampleItems);
  });

  it("excludes items with no intersection with active modules", () => {
    const result = filterByModules(sampleItems, ["other"]);
    // "시스템" has modules: ["admin"], no intersection with "other" → excluded
    const titles = result.map((i) => i.title);
    expect(titles).toContain("사용자 관리");
    expect(titles).not.toContain("시스템");
  });

  it("always includes items with no modules set", () => {
    const result = filterByModules(sampleItems, ["admin"]);
    // "사용자 관리" has no modules set → always included
    const titles = result.map((i) => i.title);
    expect(titles).toContain("사용자 관리");
    expect(titles).toContain("시스템");
  });

  it("removes group node (no perms) when all children are filtered out", () => {
    const items: AppPerm[] = [
      {
        title: "그룹",
        // no perms → group node
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
  it("sets perm on a leaf item", () => {
    const result = changePermCheck({}, sampleItems[1], "use", true);
    expect(result["/system/use"]).toBe(true);
  });

  it("checking parent checks all children (cascading down)", () => {
    const result = changePermCheck({}, sampleItems[0], "use", true);
    expect(result["/user/use"]).toBe(true);
    expect(result["/user/permission/use"]).toBe(true);
    expect(result["/user/list/use"]).toBe(true);
  });

  it("unchecking parent unchecks all children (cascading down)", () => {
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

  it("unchecking the base perm (perms[0]) unchecks all other perms", () => {
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
    // unchecking base perm "use" → "edit", "approve" are also unchecked
    expect(result["/user/edit"]).toBe(false);
    expect(result["/user/permission/edit"]).toBe(false);
    expect(result["/user/permission/approve"]).toBe(false);
    expect(result["/user/list/edit"]).toBe(false);
  });

  it("checking non-base perm cascades to children, skipping items where base perm is off", () => {
    // parent (/user) base perm "use" is off, but children's "use" is on
    const initial: Record<string, boolean> = {
      "/user/permission/use": true,
      "/user/list/use": true,
    };
    const result = changePermCheck(initial, sampleItems[0], "edit", true);
    // parent (/user): use is off → skip setting edit
    expect(result["/user/edit"]).toBeUndefined();
    // children: use is on → edit is set
    expect(result["/user/permission/edit"]).toBe(true);
    expect(result["/user/list/edit"]).toBe(true);
  });
});

// =====================
// Part 2: component rendering tests
// =====================

describe("PermissionTable component", () => {
  describe("basic rendering", () => {
    it("renders as DataSheet (div with data-sheet attribute)", () => {
      const { container } = render(() => <PermissionTable items={sampleItems} />);
      const wrapper = container.querySelector("[data-sheet]");
      expect(wrapper).toBeTruthy();
      expect(wrapper!.tagName).toBe("DIV");
    });

    it("renders a table inside DataSheet", () => {
      const { container } = render(() => <PermissionTable items={sampleItems} />);
      const table = container.querySelector("[data-sheet] table");
      expect(table).toBeTruthy();
    });

    it("displays perm type columns in header", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("use")).toBeTruthy();
      expect(getByText("edit")).toBeTruthy();
      expect(getByText("approve")).toBeTruthy();
    });

    it("displays item titles", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("사용자 관리")).toBeTruthy();
      expect(getByText("시스템")).toBeTruthy();
    });

    it("child items are expanded by default", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      expect(getByText("권한 설정")).toBeTruthy();
      expect(getByText("사용자 목록")).toBeTruthy();
    });
  });

  describe("checkbox interaction", () => {
    it("clicking a checkbox calls onValueChange", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <PermissionTable items={sampleItems} value={{}} onValueChange={handleChange} />
        </I18nProvider></ConfigProvider>
      ));

      const checkboxes = getAllByRole("checkbox");
      // click the first checkbox
      fireEvent.click(checkboxes[0]);
      expect(handleChange).toHaveBeenCalled();
    });

    it("controlled pattern: value prop is reflected in checkboxes", () => {
      const [value, setValue] = createSignal<Record<string, boolean>>({
        "/system/use": true,
      });

      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <PermissionTable items={[sampleItems[1]]} value={value()} onValueChange={setValue} />
        </I18nProvider></ConfigProvider>
      ));

      const checkboxes = getAllByRole("checkbox");
      // "시스템"'s "use" checkbox should be checked
      const checkedBox = checkboxes.find((cb) => cb.getAttribute("aria-checked") === "true");
      expect(checkedBox).toBeTruthy();
    });
  });

  describe("expand/collapse", () => {
    it("rows with children have an expand/collapse toggle", () => {
      const { getByText } = render(() => <PermissionTable items={sampleItems} />);
      // find the row containing "사용자 관리" and check for expand toggle button
      const titleEl = getByText("사용자 관리");
      const row = titleEl.closest("tr")!;
      const expandButton = row.querySelector("button");
      expect(expandButton).toBeTruthy();
    });

    it("clicking collapse button removes children from the DOM", () => {
      const { getByText, queryByText } = render(() => <PermissionTable items={sampleItems} />);

      // initially: children are visible (all expanded by default)
      expect(getByText("권한 설정")).toBeTruthy();
      expect(getByText("사용자 목록")).toBeTruthy();

      // click collapse button (expand toggle on "사용자 관리" row)
      const titleEl = getByText("사용자 관리");
      const row = titleEl.closest("tr")!;
      const expandButton = row.querySelector("button")!;
      fireEvent.click(expandButton);

      // children are removed from the DOM (Sheet does not render collapsed items)
      expect(queryByText("권한 설정")).toBeNull();
      expect(queryByText("사용자 목록")).toBeNull();
    });
  });

  describe("disabled state", () => {
    it("checkbox clicks are ignored when disabled prop is true", () => {
      const handleChange = vi.fn();
      const { getAllByRole } = render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <PermissionTable items={sampleItems} value={{}} onValueChange={handleChange} disabled />
        </I18nProvider></ConfigProvider>
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
