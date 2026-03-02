import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal, type Accessor } from "solid-js";
import {
  SharedDataSelect,
  type InjectedSelectProps,
} from "@simplysm/solid";
import { type SharedDataAccessor } from "../../../../src/providers/shared-data/SharedDataContext";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
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
    get: (key) => itemsSignal().find((item) => item.id === key),
    emit: vi.fn(async () => {}),
    getKey: (item) => item.id,
    getSearchText: (item) => item.name,
  };
}

function TestModalComponent(props: { confirmKeys: number[] } & InjectedSelectProps) {
  return (
    <div data-testid="modal-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button
        data-testid="modal-confirm"
        onClick={() => props.onSelect({ keys: props.confirmKeys })}
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

  it("opens modal and applies selection result", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={1}
        onValueChange={onValueChange}
        modal={{
          component: TestModalComponent,
          props: { confirmKeys: [2] },
          option: { header: "Select Item" },
        }}
      >
        <SharedDataSelect.ItemTemplate>
          {(item: TestItem) => <span>{item.name}</span>}
        </SharedDataSelect.ItemTemplate>
      </SharedDataSelect>
    ));

    // Click search action button to open modal
    const searchBtn = container.querySelector("[data-select-action]") as HTMLButtonElement;
    expect(searchBtn).not.toBeNull();
    searchBtn.click();

    // Confirm in modal
    await vi.waitFor(() => {
      const confirmBtn = document.querySelector("[data-testid='modal-confirm']") as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(2);
    });
  });

  it("passes selectedKeys to modal component", async () => {
    const [items] = createSignal(testItems);
    const accessor = createMockAccessor(items);

    const { container } = renderWithDialog(() => (
      <SharedDataSelect
        data={accessor}
        value={3}
        onValueChange={() => {}}
        modal={{
          component: TestModalComponent,
          props: { confirmKeys: [] },
        }}
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
