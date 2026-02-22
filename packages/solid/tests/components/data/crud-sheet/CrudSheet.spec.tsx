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
import { DialogInstanceContext } from "../../../../src/components/disclosure/DialogInstanceContext";
import { Dialog } from "../../../../src/components/disclosure/Dialog";

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

function DialogWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>
        <Dialog open fill>
          <Dialog.Header>Test Dialog</Dialog.Header>
          <DialogInstanceContext.Provider value={{ close: () => {} }}>
            {props.children}
          </DialogInstanceContext.Provider>
        </Dialog>
      </NotificationProvider>
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

describe("CrudSheet inline edit", () => {
  const searchFn = () =>
    Promise.resolve({
      items: [
        { id: 1, name: "홍길동", isDeleted: false },
        { id: 2, name: "김철수", isDeleted: false },
      ],
      pageCount: 1,
    });

  it("inlineEdit 제공 시 행추가 버튼이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("행 추가");
  });

  it("inlineEdit 미제공 시 행추가 버튼이 없다", async () => {
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
    expect(container.textContent).not.toContain("행 추가");
  });

  it("deleteProp 제공 시 삭제 컬럼이 자동 생성된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          itemDeleted={(item) => item.isDeleted}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
            deleteProp: "isDeleted",
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // 삭제 컬럼이 첫 번째 fixed 컬럼으로 추가됨
    const columns = container.querySelectorAll("thead th");
    expect(columns.length).toBe(2); // 삭제 컬럼 + 이름 컬럼
  });
});

describe("CrudSheet itemDeletable", () => {
  it("itemDeletable=false인 아이템의 인라인 삭제 버튼이 disabled이다", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [
          { id: 1, name: "홍길동", isDeleted: false },
          { id: 2, name: "김철수", isDeleted: false },
        ],
        pageCount: 1,
      });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          itemDeletable={(item) => item.id !== 1}
          itemDeleted={(item) => item.isDeleted}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
            deleteProp: "isDeleted",
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));

    // 삭제 컬럼의 링크들
    const deleteLinks = container.querySelectorAll('a[aria-disabled="true"]');
    expect(deleteLinks.length).toBe(1); // id=1인 아이템만 disabled
  });
});

describe("CrudSheet editable (renamed from canEdit)", () => {
  it("editable=false 시 인라인 편집 버튼이 숨겨진다", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [{ id: 1, name: "홍길동", isDeleted: false }],
        pageCount: 1,
      });

    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={searchFn}
          getItemKey={(item) => item.id}
          editable={false}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("행 추가");
  });
});

describe("CrudSheet select mode", () => {
  it("selectMode 설정 시 toolbar이 숨겨진다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="single"
          onSelect={() => {}}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("행 추가");
  });

  it("selectMode='multiple' 시 확인 버튼이 표시된다", async () => {
    render(() => (
      <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multiple"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </DialogWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // Dialog renders via Portal so content is in document.body
    const dialogContent = document.querySelector("[data-modal-content]");
    expect(dialogContent?.textContent).toContain("확인");
  });
});

describe("CrudSheet control mode", () => {
  it("topbar/dialog 없이 inlineEdit 제공 시 저장/새로고침 버튼이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [] })}
          getItemKey={(item) => item.id}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
    expect(container.textContent).toContain("새로고침");
  });

  it("inlineEdit 없으면 저장 버튼이 없고 새로고침 버튼은 있다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [] })}
          getItemKey={(item) => item.id}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).toContain("새로고침");
  });
});

describe("CrudSheet modal mode", () => {
  it("Dialog 안에서 selectMode='multiple' 시 하단 바가 표시된다", async () => {
    render(() => (
      <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multiple"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </DialogWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // Dialog renders via Portal so content is in document.body
    const dialogContent = document.querySelector("[data-modal-content]");
    expect(dialogContent?.textContent).toContain("확인");
  });

  it("Dialog 없이 selectMode='multiple'이면 하단 바가 표시되지 않는다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multiple"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("확인");
  });
});
