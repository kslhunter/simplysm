import { describe, it, expect } from "vitest";
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  CrudSheetColumn,
  isCrudSheetColumnDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetColumn";
import {
  CrudSheetFilter,
  isCrudSheetFilterDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetFilter";
import {
  CrudSheetTools,
  isCrudSheetToolsDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetTools";
import {
  CrudSheetHeader,
  isCrudSheetHeaderDef,
} from "../../../../src/components/data/crud-sheet/CrudSheetHeader";
import { CrudSheet } from "../../../../src/components/data/crud-sheet/CrudSheet";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";

interface TestItem {
  id?: number;
  name: string;
  isDeleted: boolean;
}

function TestWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>{props.children}</NotificationProvider>
    </ConfigContext.Provider>
  );
}

describe("CrudSheet types", () => {
  it("CrudSheetColumn: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetColumn<TestItem>({
      key: "name",
      header: "이름",
      children: (ctx) => <div>{ctx.item.name}</div>,
    });

    expect(isCrudSheetColumnDef(def)).toBe(true);
    expect((def as any).key).toBe("name");
  });

  it("CrudSheetFilter: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetFilter({
      children: (_filter, _setFilter) => <div>filter</div>,
    });

    expect(isCrudSheetFilterDef(def)).toBe(true);
  });

  it("CrudSheetTools: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetTools({
      children: (_ctx) => <div>tools</div>,
    });

    expect(isCrudSheetToolsDef(def)).toBe(true);
  });

  it("CrudSheetHeader: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudSheetHeader({
      children: <div>header</div>,
    });

    expect(isCrudSheetHeaderDef(def)).toBe(true);
  });
});

describe("CrudSheet rendering", () => {
  it("기본 렌더링: 컬럼, 필터, BusyContainer가 표시된다", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [{ id: 1, name: "홍길동", isDeleted: false }],
        pageCount: 1,
      });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, { searchText?: string }>
          search={searchFn}
          getItemKey={(item) => item.id}
          filterInitial={{ searchText: "" }}
        >
          <CrudSheet.Filter<{ searchText?: string }>>
            {(filter, _setFilter) => <input value={filter.searchText ?? ""} />}
          </CrudSheet.Filter>

          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    // 비동기 조회 대기
    await new Promise((r) => setTimeout(r, 100));

    // DataSheet가 렌더링됨
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBeGreaterThanOrEqual(1);
    expect(ths[0].textContent).toContain("이름");

    // 데이터 행이 표시됨
    expect(container.textContent).toContain("홍길동");
  });

  it("filterInitial 없으면 빈 객체로 초기화된다", async () => {
    const searchFn = () => Promise.resolve({ items: [] as TestItem[] });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.querySelector("thead")).toBeTruthy();
  });
});
