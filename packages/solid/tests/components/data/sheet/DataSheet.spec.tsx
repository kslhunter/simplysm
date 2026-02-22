import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { DataSheet } from "../../../../src/components/data/sheet/DataSheet";
import {
  applySorting,
  collectAllExpandable,
  flattenTree,
} from "../../../../src/components/data/sheet/sheetUtils";
import type { SortingDef } from "../../../../src/components/data/sheet/types";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import type { JSX } from "solid-js";

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
  it("기본 렌더링: 컬럼 헤더와 데이터 행이 표시된다", () => {
    const { container } = render(() => (
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
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(3);
    expect(ths[0].textContent).toContain("이름");
    expect(ths[1].textContent).toContain("나이");
    expect(ths[2].textContent).toContain("이메일");

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  it("다단계 헤더: colspan과 rowspan이 올바르게 적용된다", () => {
    const { container } = render(() => (
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
    ));

    const headerRows = container.querySelectorAll("thead tr");
    // 2행: 첫 행에 "기본정보"(colspan=2) + "이메일"(rowspan=2), 둘째 행에 "이름" + "나이"
    expect(headerRows.length).toBeGreaterThanOrEqual(2);

    const firstRowThs = headerRows[0].querySelectorAll("th");
    // "기본정보" th는 colspan=2
    const groupTh = Array.from(firstRowThs).find((th) => th.textContent.includes("기본정보"));
    expect(groupTh).toBeTruthy();
    expect(groupTh!.getAttribute("colspan")).toBe("2");

    // "이메일" th는 rowspan=2
    const emailTh = Array.from(firstRowThs).find((th) => th.textContent.includes("이메일"));
    expect(emailTh).toBeTruthy();
    expect(emailTh!.getAttribute("rowspan")).toBe("2");
  });

  it("합계 행: summary가 있으면 thead에 합계 행이 표시된다", () => {
    const { container } = render(() => (
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
    ));

    const theadRows = container.querySelectorAll("thead tr");
    // 헤더 1행 + 합계 1행 = 2행
    expect(theadRows.length).toBe(2);

    const summaryRow = theadRows[theadRows.length - 1];
    expect(summaryRow.textContent).toContain("합계: 83");
  });

  it("빈 데이터: tbody가 비어있다", () => {
    const { container } = render(() => (
      <TestWrapper>
        <DataSheet items={[] as TestItem[]} persistKey="test-empty">
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);

    // 헤더는 여전히 표시
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
  });

  it("hidden 컬럼은 렌더링되지 않는다", () => {
    const { container } = render(() => (
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
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
    expect(ths[0].textContent).toContain("이름");
  });

  it("정렬: 헤더 클릭 시 onSortsChange가 호출된다", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
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
    ));

    // "이름" 헤더 클릭
    const ths = container.querySelectorAll("thead th");
    (ths[0] as HTMLElement).click();
    expect(capturedSorts).toEqual([{ key: "name", desc: false }]);
  });

  it("정렬: sortable={false} 컬럼은 클릭해도 정렬되지 않는다", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
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
    ));

    const th = container.querySelector("thead th") as HTMLElement;
    th.click();
    expect(capturedSorts).toEqual([]);
  });

  it("자동정렬: autoSort가 true면 데이터가 정렬된다", () => {
    const { container } = render(() => (
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
    ));

    const cells = container.querySelectorAll("tbody [data-testid='name']");
    const names = Array.from(cells).map((c) => c.textContent);
    expect(names).toEqual(["김철수", "이영희", "홍길동"]);
  });

  it("페이지네이션: itemsPerPage로 데이터가 잘린다", () => {
    const { container } = render(() => (
      <TestWrapper>
        <DataSheet items={testData} persistKey="test-paging" itemsPerPage={2} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });

  it("페이지네이션: 2페이지 이상일 때 Pagination이 표시된다", () => {
    const { container } = render(() => (
      <TestWrapper>
        <DataSheet items={testData} persistKey="test-paging-nav" itemsPerPage={2} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeTruthy();
  });

  it("페이지네이션: 1페이지면 Pagination이 표시되지 않는다", () => {
    const { container } = render(() => (
      <TestWrapper>
        <DataSheet items={testData} persistKey="test-no-paging" itemsPerPage={10} page={1}>
          <DataSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeFalsy();
  });

  it("고정 컬럼: fixed 컬럼의 td에 sticky 클래스가 적용된다", () => {
    const { container } = render(() => (
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
    ));

    const tds = container.querySelectorAll("tbody tr:first-child td");
    expect(tds[0].classList.contains("sticky")).toBe(true);
    expect(tds[1].classList.contains("sticky")).toBe(false);
  });

  it("고정 컬럼: 마지막 고정 컬럼에 경계 테두리 클래스가 적용된다", () => {
    const { container } = render(() => (
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
    ));

    const tds = container.querySelectorAll("tbody tr:first-child td");
    // fixedLastClass에 포함된 클래스 확인
    expect(tds[0].classList.contains("border-r")).toBe(true);
  });

  it("리사이저: resizable 컬럼에 리사이저 핸들이 있다", () => {
    const { container } = render(() => (
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
    ));

    const resizers = container.querySelectorAll(".cursor-ew-resize");
    // 첫 번째 컬럼에만 리사이저가 있어야 함
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

  it("빈 sorts면 원본 순서 유지", () => {
    const result = applySorting(items, []);
    expect(result.map((i) => i.name)).toEqual(["다", "가", "나"]);
  });

  it("단일 오름차순 정렬", () => {
    const result = applySorting(items, [{ key: "name", desc: false }]);
    expect(result.map((i) => i.name)).toEqual(["가", "나", "다"]);
  });

  it("단일 내림차순 정렬", () => {
    const result = applySorting(items, [{ key: "age", desc: true }]);
    expect(result.map((i) => i.age)).toEqual([30, 28, 25]);
  });

  it("다중 정렬: 첫 번째 키 우선, 동일 값은 두 번째 키로", () => {
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

  it("원본 배열을 변경하지 않는다", () => {
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

  it("getChildren이 없으면 flat 리스트를 반환한다", () => {
    const result = flattenTree(tree, []);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(result.every((r) => r.depth === 0)).toBe(true);
    expect(result.every((r) => !r.hasChildren)).toBe(true);
  });

  it("모두 접힌 상태면 루트만 반환한다", () => {
    const result = flattenTree(tree, [], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(result[0].hasChildren).toBe(true);
    expect(result[1].hasChildren).toBe(false);
  });

  it("루트 확장 시 1단계 자식이 포함된다", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "a1", "a2", "b"]);
    expect(result[1].depth).toBe(1);
    expect(result[1].parent).toBe(tree[0]);
    expect(result[2].hasChildren).toBe(true);
  });

  it("중첩 확장 시 2단계 자식까지 포함된다", () => {
    const a2 = tree[0].children![1];
    const result = flattenTree(tree, [tree[0], a2], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "a1", "a2", "a2x", "b"]);
    expect(result[3].depth).toBe(2);
    expect(result[3].parent).toBe(a2);
  });

  it("접힌 노드의 자식은 포함되지 않는다", () => {
    // a2만 확장하고 a는 접힘 → a2 자체가 보이지 않으므로 a2의 자식도 안 보임
    const a2 = tree[0].children![1];
    const result = flattenTree(tree, [a2], getChildren);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
  });

  it("빈 배열이면 빈 결과를 반환한다", () => {
    const result = flattenTree([], [], getChildren);
    expect(result).toEqual([]);
  });

  it("row는 순서대로 증가한다", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    expect(result.map((r) => r.row)).toEqual([0, 1, 2, 3]);
  });

  it("index는 포함 배열 내 위치를 반환한다", () => {
    const result = flattenTree(tree, [tree[0]], getChildren);
    // tree[0]="a" → index 0 (root items[0])
    // tree[0].children[0]="a1" → index 0 (children[0])
    // tree[0].children[1]="a2" → index 1 (children[1])
    // tree[1]="b" → index 1 (root items[1])
    expect(result.map((r) => r.index)).toEqual([0, 0, 1, 1]);
  });

  it("getOriginalIndex가 주어지면 root의 index에 원본 인덱스를 사용한다", () => {
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

  it("자식이 있는 모든 노드를 재귀적으로 수집한다", () => {
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

  it("자식이 없는 트리면 빈 배열을 반환한다", () => {
    const tree: TreeNode[] = [{ id: "a" }, { id: "b" }];
    const result = collectAllExpandable(tree, getChildren);
    expect(result).toEqual([]);
  });
});

describe("DataSheet 트리 확장", () => {
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

  it("getChildren 설정 시 확장 기능 컬럼이 렌더링된다", () => {
    const { container } = render(() => (
      <TestWrapper>
        <DataSheet items={treeData} persistKey="test-tree" getChildren={(item) => item.children}>
          <DataSheet.Column<TreeItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </DataSheet.Column>
        </DataSheet>
      </TestWrapper>
    ));

    // colgroup에 확장 컬럼 col이 추가됨
    const cols = container.querySelectorAll("colgroup col");
    expect(cols.length).toBe(2); // 확장 컬럼 + name 컬럼

    // 헤더에 확장 토글 버튼이 존재
    const expandBtn = container.querySelector("thead button");
    expect(expandBtn).toBeTruthy();
  });

  it("접힌 상태에서는 루트 항목만 표시된다", () => {
    const { container } = render(() => (
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
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    const names = container.querySelectorAll("tbody [data-testid='name']");
    expect(Array.from(names).map((n) => n.textContent)).toEqual(["폴더A", "폴더B"]);
  });

  it("확장된 항목의 자식이 표시된다", () => {
    const { container } = render(() => (
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
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(4); // 폴더A, 파일A1, 파일A2, 폴더B

    const names = container.querySelectorAll("tbody [data-testid='name']");
    expect(Array.from(names).map((n) => n.textContent)).toEqual([
      "폴더A",
      "파일A1",
      "파일A2",
      "폴더B",
    ]);
  });

  it("자식이 없는 항목은 확장 아이콘이 숨겨진다", () => {
    const { container } = render(() => (
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
    ));

    const tbodyRows = container.querySelectorAll("tbody tr");
    // 폴더B(인덱스 1)에는 자식이 없으므로 확장 버튼이 없어야 함
    const secondRowBtns = tbodyRows[1].querySelectorAll("button");
    expect(secondRowBtns.length).toBe(0);

    // 폴더A(인덱스 0)에는 자식이 있으므로 확장 버튼이 있어야 함
    const firstRowBtns = tbodyRows[0].querySelectorAll("button");
    expect(firstRowBtns.length).toBe(1);
  });
});
