import { describe, it, expect } from "vitest";
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  CrudSheetColumn,
  isCrudSheetColumnDef,
} from "../../../../src/components/features/crud-sheet/CrudSheetColumn";
import {
  CrudSheetFilter,
  isCrudSheetFilterDef,
} from "../../../../src/components/features/crud-sheet/CrudSheetFilter";
import {
  CrudSheetTools,
  isCrudSheetToolsDef,
} from "../../../../src/components/features/crud-sheet/CrudSheetTools";
import {
  CrudSheetHeader,
  isCrudSheetHeaderDef,
} from "../../../../src/components/features/crud-sheet/CrudSheetHeader";
import { CrudSheet } from "../../../../src/components/features/crud-sheet/CrudSheet";
import { ConfigContext, ConfigProvider } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { DialogInstanceContext } from "../../../../src/components/disclosure/DialogInstanceContext";
import { Dialog } from "../../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";

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
  it("CrudSheetColumn: returns plain object and is identifiable by type guard", () => {
    const def = CrudSheetColumn<TestItem>({
      key: "name",
      header: "이름",
      children: (ctx) => <div>{ctx.item.name}</div>,
    });

    expect(isCrudSheetColumnDef(def)).toBe(true);
    expect((def as any).key).toBe("name");
  });

  it("CrudSheetFilter: returns plain object and is identifiable by type guard", () => {
    const def = CrudSheetFilter({
      children: (_filter, _setFilter) => <div>filter</div>,
    });

    expect(isCrudSheetFilterDef(def)).toBe(true);
  });

  it("CrudSheetTools: returns plain object and is identifiable by type guard", () => {
    const def = CrudSheetTools({
      children: (_ctx) => <div>tools</div>,
    });

    expect(isCrudSheetToolsDef(def)).toBe(true);
  });

  it("CrudSheetHeader: returns plain object and is identifiable by type guard", () => {
    const def = CrudSheetHeader({
      children: <div>header</div>,
    });

    expect(isCrudSheetHeaderDef(def)).toBe(true);
  });
});

describe("CrudSheet rendering", () => {
  it("basic rendering: column, filter, and BusyContainer are displayed", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [{ id: 1, name: "홍길동", isDeleted: false }],
        pageCount: 1,
      });

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    // Wait for async search
    await new Promise((r) => setTimeout(r, 100));

    // DataSheet is rendered
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBeGreaterThanOrEqual(1);
    expect(ths[0].textContent).toContain("이름");

    // Data rows are displayed
    expect(container.textContent).toContain("홍길동");
  });

  it("filterInitial not provided: initializes with empty object", async () => {
    const searchFn = () => Promise.resolve({ items: [] as TestItem[] });

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
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

  it("Add Row button is displayed when inlineEdit is provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Add Row");
  });

  it("Add Row button is not present when inlineEdit is not provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Add Row");
  });

  it("delete column is auto-generated when deleteProp is provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // Delete column is added as the first fixed column
    const columns = container.querySelectorAll("thead th");
    expect(columns.length).toBe(2); // delete column + name column
  });
});

describe("CrudSheet itemDeletable", () => {
  it("inline delete button is disabled for items where itemDeletable=false", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [
          { id: 1, name: "홍길동", isDeleted: false },
          { id: 2, name: "김철수", isDeleted: false },
        ],
        pageCount: 1,
      });

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));

    // Links in the delete column
    const deleteLinks = container.querySelectorAll('a[aria-disabled="true"]');
    expect(deleteLinks.length).toBe(1); // only item with id=1 is disabled
  });
});

describe("CrudSheet editable (renamed from canEdit)", () => {
  it("inline edit buttons are hidden when editable=false", async () => {
    const searchFn = () =>
      Promise.resolve({
        items: [{ id: 1, name: "홍길동", isDeleted: false }],
        pageCount: 1,
      });

    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Add Row");
  });
});

describe("CrudSheet select mode", () => {
  it("toolbar is hidden when selectMode is set", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Add Row");
  });

  it("Confirm button is displayed when selectMode='multiple'", async () => {
    render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // Dialog renders via Portal so content is in document.body
    const dialogContent = document.querySelector("[data-modal-content]");
    expect(dialogContent?.textContent).toContain("Confirm");
  });
});

describe("CrudSheet control mode", () => {
  it("Save/Refresh buttons are displayed when inlineEdit is provided without topbar/dialog", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("Save");
    expect(container.textContent).toContain("Refresh");
  });

  it("Save button is absent and Refresh button is present when inlineEdit is not provided", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Save");
    expect(container.textContent).toContain("Refresh");
  });
});

describe("CrudSheet modal mode", () => {
  it("bottom bar is displayed when selectMode='multiple' inside Dialog", async () => {
    render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    // Dialog renders via Portal so content is in document.body
    const dialogContent = document.querySelector("[data-modal-content]");
    expect(dialogContent?.textContent).toContain("Confirm");
  });

  it("bottom bar is not displayed when selectMode='multiple' without Dialog", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
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
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Confirm");
  });
});
