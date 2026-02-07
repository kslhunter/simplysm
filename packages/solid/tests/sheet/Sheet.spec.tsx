import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Sheet } from "../../src/components/data/sheet/Sheet";
import { applySorting } from "../../src/components/data/sheet/sheetUtils";
import type { SortingDef } from "../../src/components/data/sheet/types";

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

describe("Sheet", () => {
  it("기본 렌더링: 컬럼 헤더와 데이터 행이 표시된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이">
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="email" header="이메일">
          {(ctx) => <div>{ctx.item.email}</div>}
        </Sheet.Column>
      </Sheet>
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
      <Sheet items={testData} key="test-multi">
        <Sheet.Column<TestItem> key="name" header={["기본정보", "이름"]}>
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header={["기본정보", "나이"]}>
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="email" header="이메일">
          {(ctx) => <div>{ctx.item.email}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const headerRows = container.querySelectorAll("thead tr");
    // 2행: 첫 행에 "기본정보"(colspan=2) + "이메일"(rowspan=2), 둘째 행에 "이름" + "나이"
    expect(headerRows.length).toBeGreaterThanOrEqual(2);

    const firstRowThs = headerRows[0].querySelectorAll("th");
    // "기본정보" th는 colspan=2
    const groupTh = Array.from(firstRowThs).find((th) => th.textContent?.includes("기본정보"));
    expect(groupTh).toBeTruthy();
    expect(groupTh!.getAttribute("colspan")).toBe("2");

    // "이메일" th는 rowspan=2
    const emailTh = Array.from(firstRowThs).find((th) => th.textContent?.includes("이메일"));
    expect(emailTh).toBeTruthy();
    expect(emailTh!.getAttribute("rowspan")).toBe("2");
  });

  it("합계 행: summary가 있으면 thead에 합계 행이 표시된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-summary">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem>
          key="age"
          header="나이"
          summary={() => <span>합계: 83</span>}
        >
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const theadRows = container.querySelectorAll("thead tr");
    // 헤더 1행 + 합계 1행 = 2행
    expect(theadRows.length).toBe(2);

    const summaryRow = theadRows[theadRows.length - 1];
    expect(summaryRow.textContent).toContain("합계: 83");
  });

  it("빈 데이터: tbody가 비어있다", () => {
    const { container } = render(() => (
      <Sheet items={[] as TestItem[]} key="test-empty">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);

    // 헤더는 여전히 표시
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
  });

  it("hidden 컬럼은 렌더링되지 않는다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-hidden">
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이" hidden>
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(1);
    expect(ths[0].textContent).toContain("이름");
  });

  it("정렬: 헤더 클릭 시 onSortsChange가 호출된다", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
      <Sheet
        items={testData}
        key="test-sort"
        sorts={[]}
        onSortsChange={(s) => { capturedSorts = s; }}
      >
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
        <Sheet.Column<TestItem> key="age" header="나이">
          {(ctx) => <div>{ctx.item.age}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    // "이름" 헤더 클릭
    const ths = container.querySelectorAll("thead th");
    (ths[0] as HTMLElement).click();
    expect(capturedSorts).toEqual([{ key: "name", desc: false }]);
  });

  it("정렬: disableSorting 컬럼은 클릭해도 정렬되지 않는다", () => {
    let capturedSorts: SortingDef[] = [];
    const { container } = render(() => (
      <Sheet
        items={testData}
        key="test-no-sort"
        sorts={[]}
        onSortsChange={(s) => { capturedSorts = s; }}
      >
        <Sheet.Column<TestItem> key="name" header="이름" disableSorting>
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const th = container.querySelector("thead th") as HTMLElement;
    th.click();
    expect(capturedSorts).toEqual([]);
  });

  it("자동정렬: useAutoSort가 true면 데이터가 정렬된다", () => {
    const { container } = render(() => (
      <Sheet
        items={testData}
        key="test-auto-sort"
        sorts={[{ key: "name", desc: false }]}
        useAutoSort
      >
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div class="name">{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const cells = container.querySelectorAll("tbody .name");
    const names = Array.from(cells).map((c) => c.textContent);
    expect(names).toEqual(["김철수", "이영희", "홍길동"]);
  });

  it("페이지네이션: itemsPerPage로 데이터가 잘린다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-paging" itemsPerPage={2} currentPage={0}>
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });

  it("페이지네이션: 2페이지 이상일 때 Pagination이 표시된다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-paging-nav" itemsPerPage={2} currentPage={0}>
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeTruthy();
  });

  it("페이지네이션: 1페이지면 Pagination이 표시되지 않는다", () => {
    const { container } = render(() => (
      <Sheet items={testData} key="test-no-paging" itemsPerPage={10} currentPage={0}>
        <Sheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </Sheet.Column>
      </Sheet>
    ));

    const pagination = container.querySelector("[data-pagination]");
    expect(pagination).toBeFalsy();
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
