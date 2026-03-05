import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal, type Accessor } from "solid-js";
import {
  SharedDataSelect,
  type SelectDialogBaseProps,
} from "@simplysm/solid";
import { type SharedDataAccessor } from "../../../../src/providers/shared-data/SharedDataProvider";
import { DialogProvider } from "../../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

interface TestItem {
  id: number;
  name: string;
}

const testItems: TestItem[] = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
];

function createMockAccessor(itemsSignal: Accessor<TestItem[]>): SharedDataAccessor<TestItem> {
  return {
    items: itemsSignal,
    get: (key: string | number | undefined) => itemsSignal().find((item: TestItem) => item.id === key),
    emit: vi.fn(async () => {}),
    getKey: (item: TestItem) => item.id,
    itemSearchText: (item: TestItem) => item.name,
  };
}

function TestDialogComponent(props: SelectDialogBaseProps & { confirmKeys: number[] }) {
  return (
    <div data-testid="dialog-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button
        data-testid="dialog-confirm"
        onClick={() => props.close?.({ selectedKeys: props.confirmKeys })}
      >
        confirm
      </button>
    </div>
  );
}

function renderWithDialog(ui: () => import("solid-js").JSX.Element) {
  return render(() => (
    <ConfigProvider clientName="test"><I18nProvider>
      <DialogProvider>{ui()}</DialogProvider>
    </I18nProvider></ConfigProvider>
  ));
}

describe("SharedDataSelect", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders items via ItemTemplate", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);

    const { getByText } = renderWithDialog(() => (
      <SharedDataSelect data={accessor} value={1} onValueChange={() => {}}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    // Select should render with items from accessor
    expect(getByText("Apple")).toBeTruthy();
  });

  it("renders custom Action button", () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onClick = vi.fn();

    const { container } = renderWithDialog(() => (
      <SharedDataSelect data={accessor} value={1} onValueChange={() => {}}>
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
        <SharedDataSelect.Action onClick={onClick}>
          <span data-testid="custom-action">Edit</span>
        </SharedDataSelect.Action>
      </SharedDataSelect>
    ));

    const actionBtn = container.querySelector("[data-testid='custom-action']");
    expect(actionBtn).not.toBeNull();
  });

  it("opens dialog and applies selection result", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={1}
        onValueChange={onValueChange}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [2] }}
        dialogOptions={{ header: "Select Item" }}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    // Click search action button to open dialog
    const searchBtn = container.querySelector("[data-select-action]") as HTMLButtonElement;
    expect(searchBtn).not.toBeNull();
    searchBtn.click();

    // Confirm in dialog
    await vi.waitFor(() => {
      const confirmBtn = document.querySelector("[data-testid='dialog-confirm']") as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(2);
    });
  });

  it("passes selectedKeys to dialog component", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={3}
        onValueChange={() => {}}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    const searchBtn = container.querySelector("[data-select-action]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const selectedKeys = document.querySelector("[data-testid='selected-keys']");
      expect(selectedKeys?.textContent).toBe("[3]");

      const selectMode = document.querySelector("[data-testid='select-mode']");
      expect(selectMode?.textContent).toBe("single");
    });
  });
});
