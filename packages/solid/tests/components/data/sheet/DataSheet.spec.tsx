import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { DataSheet } from "../../../../src/components/data/sheet/DataSheet";
import {
  applySorting,
  collectAllExpandable,
  flattenTree,
} from "../../../../src/components/data/sheet/sheetUtils";
import type { SortingDef } from "../../../../src/components/data/sheet/types";
import { ConfigContext, ConfigProvider } from "../../../../src/providers/ConfigContext";
import type { JSX } from "solid-js";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";

function TestWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>{props.children}</ConfigContext.Provider>
  );
}

interface TestItem {
  name: string;
  age: number;
  email: string;
}

const testData: TestItem[] = [
  { name: "홍길동", age: 30, email: "hong@test.com" },
  { name: "김철수", age: 25, email: "kim@test.com" },
  { name: "이영희", age: 28, email: "lee@test.com" },
];

describe("DataSheet", () => {
  it("basic rendering: column headers and data rows are displayed", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이">
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="email" header="이메일">
            {(ctx) => <div>{ctx.item.email}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(3);
    expect(ths[0].textContent).toContain("이름");
    expect(ths[1].textContent).toContain("나이");
    expect(ths[2].textContent).toContain("이메일");

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  it("multi-level header: colspan and rowspan are applied correctly", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-multi">
          <DataSheet.Column<TestItem> key="name" header={["기본정보", "이름"]}>
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header={["기본정보", "나이"]}>
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="email" header="이메일">
            {(ctx) => <div>{ctx.item.email}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const headerRows = container.querySelectorAll("thead tr");
    // 2 rows: first row has "기본정보"(colspan=2) + "이메일"(rowspan=2), second row has "이름" + "나이"
    expect(headerRows.length).toBeGreaterThanOrEqual(2);

    const firstRowThs = headerRows[0].querySelectorAll("th");
    // "기본정보" th has colspan=2
    const groupTh = Array.from(firstRowThs).find((th) => th.textContent.includes("기본정보"));
    expect(groupTh).toBeTruthy();
    expect(groupTh!.getAttribute("colspan")).toBe("2");

    // "이메일" th has rowspan=2
    const emailTh = Array.from(firstRowThs).find((th) => th.textContent.includes("이메일"));
    expect(emailTh).toBeTruthy();
    expect(emailTh!.getAttribute("rowspan")).toBe("2");
  });

  it("summary row: summary column displays a summary row in thead", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-summary">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이" summary={() => <span>합계: 83</span>}>
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const theadRows = container.querySelectorAll("thead tr");
    // 1 header row + 1 summary row = 2 rows
    expect(theadRows.length).toBe(2);

    const summaryRow = theadRows[theadRows.length - 1];
    expect(summaryRow.textContent).toContain("합계: 83");
  });

  it("empty data: tbody is empty", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={[] as TestItem[]} persistKey="test-empty">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);

    // header is still displayed
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
  });

  it("hidden columns are not rendered", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-hidden">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이" hidden>
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
    expect(ths[0].textContent).toContain("이름");
  });

  it("sort: clicking header calls onSortsChange", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={testData}
          persistKey="test-sort"
          sorts={[]}
          onSortsChange={(s) => {
            capturedSorts = s;
          }}
        >
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이">
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    // click "이름" header
    const ths = container.querySelectorAll("thead th");
    (ths[0] as HTMLElement).click();
    expect(capturedSorts).toEqual([{ key: "name", desc: false }]);
  });

  it("sort: sortable={false} column does not sort on click", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={testData}
          persistKey="test-no-sort"
          sorts={[]}
          onSortsChange={(s) => {
            capturedSorts = s;
          }}
        >
          <DataSheet.Column<TestItem> key="name" header="이름" sortable={false}>
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const th = container.querySelector("thead th") as HTMLElement;
    th.click();
    expect(capturedSorts).toEqual([]);
  });

  it("auto sort: data is sorted when autoSort is true", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={testData}
          persistKey="test-auto-sort"
          sorts={[{ key: "name", desc: false }]}
          autoSort
        >
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div data-testid="name">{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const cells = container.querySelectorAll("tbody [data-testid='name']");
    const names = Array.from(cells).map((c) => c.textContent);
    expect(names).toEqual(["김철수", "이영희", "홍길동"]);
  });

  it("pagination: data is sliced by itemsPerPage", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-paging" itemsPerPage={2} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });

  it("pagination: Pagination is displayed when there are 2 or more pages", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-paging-nav" itemsPerPage={2} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeTruthy();
  });

  it("pagination: Pagination is not displayed when there is only 1 page", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-no-paging" itemsPerPage={10} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeFalsy();
  });

  it("fixed column: sticky class is applied to td of fixed column", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-fixed">
          <DataSheet.Column<TestItem> key="name" header="이름" fixed width="100px">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이">
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const tds = container.querySelectorAll("tbody tr:first-child td");
    expect(tds[0].classList.contains("sticky")).toBe(true);
    expect(tds[1].classList.contains("sticky")).toBe(false);
  });

  it("fixed column: border class is applied to the last fixed column", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-fixed-border">
          <DataSheet.Column<TestItem> key="name" header="이름" fixed width="100px">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이">
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const tds = container.querySelectorAll("tbody tr:first-child td");
    // verify class included in fixedLastClass
    expect(tds[0].classList.contains("border-r")).toBe(true);
  });

  it("resizer: resizable column has a resizer handle", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={testData} persistKey="test-resizer">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
          <DataSheet.Column<TestItem> key="age" header="나이" resizable={false}>
            {(ctx) => <div>{ctx.item.age}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const resizers = container.querySelectorAll(".cursor-ew-resize");
    // only the first column should have a resizer
    expect(resizers.length).toBe(1);
  });
});

describe("applySorting", () => {
  interface Item {
    name: string;
    age: number;
  }

  const items: Item[] = [
    { name: "다", age: 30 },
    { name: "가", age: 25 },
    { name: "나", age: 28 },
  ];

  it("preserves original order when sorts is empty", () => {
    const result = applySorting(items, []);
    expect(result.map((i) => i.name)).toEqual(["다", "가", "나"]);
  });

  it("single ascending sort", () => {
    const result = applySorting(items, [{ key: "name", desc: false }]);
    expect(result.map((i) => i.name)).toEqual(["가", "나", "다"]);
  });

  it("single descending sort", () => {
    const result = applySorting(items, [{ key: "age", desc: true }]);
    expect(result.map((i) => i.age)).toEqual([30, 28, 25]);
  });

  it("multi-sort: first key takes priority, ties broken by second key", () => {
    const data: Item[] = [
      { name: "가", age: 30 },
      { name: "나", age: 25 },
      { name: "가", age: 20 },
    ];
    const result = applySorting(data, [
      { key: "name", desc: false },
      { key: "age", desc: false },
    ]);
    expect(result).toEqual([
      { name: "가", age: 20 },
      { name: "가", age: 30 },
      { name: "나", age: 25 },
    ]);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    applySorting(items, [{ key: "name", desc: false }]);
    expect(items).toEqual(original);
  });
});

describe("flattenTree", () => {
  interface TreeNode {
    id: string;
    children?: TreeNode[];
  }

  const getChildren = (item: TreeNode) => item.children;

  const tree: TreeNode[] = [
    {
      id: "a",
      children: [{ id: "a1" }, { id: "a2", children: [{ id: "a2x" }] }],
    },
    { id: "b" },
  ];

  it("returns flat list when getChildren is not provided", () => {
    const result = flattenTree(tree, []);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(result.every((r) => r.depth === 0)).toBe(true);
    expect(result.every((r) => !r.hasChildren)).toBe(true);
  });

  it("returns only roots when all are collapsed", () => {
    const result = flattenTree(tree, [], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(result[0].hasChildren).toBe(true);
    expect(result[1].hasChildren).toBe(false);
  });

  it("includes 1-level children when root is expanded", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "a1", "a2", "b"]);
    expect(result[1].depth).toBe(1);
    expect(result[1].parent).toBe(tree[0]);
    expect(result[2].hasChildren).toBe(true);
  });

  it("includes up to 2-level children when nested expanded", () => {
    const a2 = tree[0].children![1];
    const result = flattenTree(tree, [tree[0], a2], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "a1", "a2", "a2x", "b"]);
    expect(result[3].depth).toBe(2);
    expect(result[3].parent).toBe(a2);
  });

  it("children of collapsed nodes are not included", () => {
    // only a2 is expanded but a is collapsed → a2 itself is not visible, so its children are also hidden
    const a2 = tree[0].children![1];
    const result = flattenTree(tree, [a2], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
  });

  it("returns empty result for empty array", () => {
    const result = flattenTree([], [], getChildren);
    expect(result).toEqual([]);
  });

  it("row increments in order", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    expect(result.map((r) => r.row)).toEqual([0, 1, 2, 3]);
  });

  it("index returns position within containing array", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    // tree[0]="a" → index 0 (root items[0])
    // tree[0].children[0]="a1" → index 0 (children[0])
    // tree[0].children[1]="a2" → index 1 (children[1])
    // tree[1]="b" → index 1 (root items[1])
    expect(result.map((r) => r.index)).toEqual([0, 0, 1, 1]);
  });

  it("uses original index for root when getOriginalIndex is provided", () => {
    const items = [tree[1], tree[0]]; // reversed
    const originalMap = new Map<TreeNode, number>();
    tree.forEach((item, i) => originalMap.set(item, i));

    const result = flattenTree(
      items,
      [tree[0]],
      getChildren,
      (item) => originalMap.get(item) ?? -1,
    );
    // items[0]=tree[1]="b" → originalIndex 1
    // items[1]=tree[0]="a" → originalIndex 0
    // "a".children[0]="a1" → localIdx 0
    // "a".children[1]="a2" → localIdx 1
    expect(result.map((r) => r.index)).toEqual([1, 0, 0, 1]);
    expect(result.map((r) => r.row)).toEqual([0, 1, 2, 3]);
  });
});

describe("collectAllExpandable", () => {
  interface TreeNode {
    id: string;
    children?: TreeNode[];
  }

  const getChildren = (item: TreeNode) => item.children;

  it("recursively collects all nodes that have children", () => {
    const tree: TreeNode[] = [
      {
        id: "a",
        children: [{ id: "a1" }, { id: "a2", children: [{ id: "a2x" }] }],
      },
      { id: "b" },
    ];
    const result = collectAllExpandable(tree, getChildren);
    expect(result.map((r) => r.id)).toEqual(["a", "a2"]);
  });

  it("returns empty array when no nodes have children", () => {
    const tree: TreeNode[] = [{ id: "a" }, { id: "b" }];
    const result = collectAllExpandable(tree, getChildren);
    expect(result).toEqual([]);
  });
});

describe("DataSheet tree expansion", () => {
  interface TreeItem {
    name: string;
    children?: TreeItem[];
  }

  const treeData: TreeItem[] = [
    {
      name: "폴더A",
      children: [{ name: "파일A1" }, { name: "파일A2" }],
    },
    { name: "폴더B" },
  ];

  it("renders expand column when getChildren is set", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet items={treeData} persistKey="test-tree" getChildren={(item) => item.children}>
          <DataSheet.Column<TreeItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    // expand column col is added to colgroup
    const cols = container.querySelectorAll("colgroup col");
    expect(cols.length).toBe(2); // expand column + name column

    // expand toggle button exists in header
    const expandBtn = container.querySelector("thead button");
    expect(expandBtn).toBeTruthy();
  });

  it("displays only root items in collapsed state", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={treeData}
          persistKey="test-tree-collapsed"
          getChildren={(item) => item.children}
          expandedItems={[]}
        >
          <DataSheet.Column<TreeItem> key="name" header="이름">
            {(ctx) => <div data-testid="name">{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    const names = container.querySelectorAll("tbody [data-testid='name']");
    expect(Array.from(names).map((n) => n.textContent)).toEqual(["폴더A", "폴더B"]);
  });

  it("displays children of expanded items", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={treeData}
          persistKey="test-tree-expanded"
          getChildren={(item) => item.children}
          expandedItems={[treeData[0]]}
        >
          <DataSheet.Column<TreeItem> key="name" header="이름">
            {(ctx) => <div data-testid="name">{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4); // 폴더A, 파일A1, 파일A2, 폴더B (test data kept as-is)

    const names = container.querySelectorAll("tbody [data-testid='name']");
    expect(Array.from(names).map((n) => n.textContent)).toEqual([
      "폴더A",
      "파일A1",
      "파일A2",
      "폴더B",
    ]);
  });

  it("hides expand icon for items with no children", () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <DataSheet
          items={treeData}
          persistKey="test-tree-no-children"
          getChildren={(item) => item.children}
          expandedItems={[]}
        >
          <DataSheet.Column<TreeItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
      </I18nProvider></ConfigProvider>
    ));

    const tbodyRows = container.querySelectorAll("tbody tr");
    // 폴더B (index 1) has no children → no expand button
    const secondRowBtns = tbodyRows[1].querySelectorAll("button");
    expect(secondRowBtns.length).toBe(0);

    // 폴더A (index 0) has children → expand button exists
    const firstRowBtns = tbodyRows[0].querySelectorAll("button");
    expect(firstRowBtns.length).toBe(1);
  });
});
