import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import { CrudSheet } from "../../../../src/components/features/crud-sheet/CrudSheet";
import { ConfigContext, ConfigProvider } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";
import { Dialog } from "../../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";

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
        <Dialog open mode="fill">
          <Dialog.Header>Test Dialog</Dialog.Header>
          {props.children}
        </Dialog>
      </NotificationProvider>
    </ConfigContext.Provider>
  );
}

describe("CrudSheet rendering", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

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
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

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
          isItemDeleted={(item) => item.isDeleted}
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

describe("CrudSheet isItemDeletable", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  it("inline delete button is disabled for items where isItemDeletable=false", async () => {
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
          isItemDeletable={(item) => item.id !== 1}
          isItemDeleted={(item) => item.isDeleted}
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
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

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
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  it("toolbar is hidden when selectionMode is set inside Dialog", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectionMode="single"
          onSelect={() => {}}
          close={() => {}}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </DialogWrapper>
      </I18nProvider></ConfigProvider>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("Add Row");
  });

  it("Confirm button is displayed when selectionMode='multiple'", async () => {
    render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectionMode="multiple"
          onSelect={() => {}}
          close={() => {}}
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
    const dialogContent = document.querySelector("[data-dialog-content]");
    expect(dialogContent?.textContent).toContain("Confirm");
  });
});

describe("CrudSheet control mode", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

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

describe("CrudSheet dialog mode", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    localStorage.removeItem("test.i18n-locale");
  });

  it("bottom bar is displayed when selectionMode='multiple' inside Dialog", async () => {
    render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectionMode="multiple"
          onSelect={() => {}}
          close={() => {}}
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
    const dialogContent = document.querySelector("[data-dialog-content]");
    expect(dialogContent?.textContent).toContain("Confirm");
  });

  it("bottom bar is not displayed when selectionMode='multiple' without Dialog", async () => {
    const { container } = render(() => (
      <ConfigProvider clientName="test"><I18nProvider>
        <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectionMode="multiple"
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
