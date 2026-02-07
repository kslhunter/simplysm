import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Sheet } from "../../src/components/data/sheet/Sheet";

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
});
