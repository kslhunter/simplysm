import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { DataSelectButton, type InjectedSelectProps } from "@simplysm/solid";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../../src/providers/ConfigContext";

// item type for tests
interface TestItem {
  id: number;
  name: string;
}

const testItems: TestItem[] = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
  { id: 3, name: "Cherry" },
];

// load function (fetch items by key)
function createTestLoad() {
  const loadFn = vi.fn((keys: number[]) => {
    return testItems.filter((item) => keys.includes(item.id));
  });
  return loadFn;
}

// Modal component for tests — receives InjectedSelectProps automatically
function TestModalComponent(props: { confirmKeys: number[] } & InjectedSelectProps) {
  return (
    <div data-testid="modal-content">
      <div data-testid="select-mode">{props.selectMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button data-testid="modal-confirm" onClick={() => props.onSelect({ keys: props.confirmKeys })}>
        confirm
      </button>
    </div>
  );
}

// helper to wrap with DialogProvider
function renderWithDialog(ui: () => JSX.Element) {
  return render(() => (
    <ConfigProvider clientName="test"><I18nProvider>
      <DialogProvider>{ui()}</DialogProvider>
    </I18nProvider></ConfigProvider>
  ));
}

describe("DataSelectButton", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without value", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("[data-data-select-button]");
    expect(trigger).not.toBeNull();
    // load should not be called with empty keys
    expect(load).not.toHaveBeenCalled();
  });

  it("loads and displays a single selected item", async () => {
    const load = createTestLoad();
    const { findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const itemEl = await findByText("Apple");
    expect(itemEl).toBeTruthy();
    expect(load).toHaveBeenCalledWith([1]);
  });

  it("loads and displays multiple selected items", async () => {
    const load = createTestLoad();
    const { findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={[1, 3]}
        multiple
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const apple = await findByText("Apple");
    const cherry = await findByText("Cherry");
    expect(apple).toBeTruthy();
    expect(cherry).toBeTruthy();
    expect(load).toHaveBeenCalledWith([1, 3]);
  });

  it("reloads items when value changes", async () => {
    const load = createTestLoad();
    const [value, setValue] = createSignal<number | undefined>(1);

    const { findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={value()}
        onValueChange={setValue}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");
    expect(load).toHaveBeenCalledWith([1]);

    setValue(2);

    await findByText("Banana");
    expect(load).toHaveBeenCalledWith([2]);
  });

  it("shows clear button when value exists and not required", async () => {
    const load = createTestLoad();
    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");
    const clearBtn = container.querySelector("[data-clear-button]");
    expect(clearBtn).not.toBeNull();
  });

  it("hides clear button when required", async () => {
    const load = createTestLoad();
    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        required
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");
    const clearBtn = container.querySelector("[data-clear-button]");
    expect(clearBtn).toBeNull();
  });

  it("clears single value on clear button click", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");

    const clearBtn = container.querySelector("[data-clear-button]") as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();

    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it("clears multiple value to empty array on clear button click", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={[1, 2]}
        multiple
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");

    const clearBtn = container.querySelector("[data-clear-button]") as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();

    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("hides search button when disabled", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        disabled
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]");
    expect(searchBtn).toBeNull();
  });

  it("shows search button when not disabled", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]");
    expect(searchBtn).not.toBeNull();
  });

  it("opens modal on search button click and applies result for single select", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [2] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    // once modal opens, find and click confirm button
    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='modal-confirm']",
      ) as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(2);
    });
  });

  it("opens modal and applies result for multiple select", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        multiple
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [1, 3] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='modal-confirm']",
      ) as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith([1, 3]);
    });
  });

  it("does not change value when modal is cancelled", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [2] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const modalContent = document.querySelector("[data-testid='modal-content']");
      expect(modalContent).not.toBeNull();
    });

    // Close via ESC key
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    await new Promise((r) => setTimeout(r, 300));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows validation error when required and no value", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        required
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    // Invalid component sets setCustomValidity on hidden input
    const hiddenInput = container.querySelector("input[type='text']") as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.validationMessage).toBe("Required field");
  });

  it("custom validate function works", async () => {
    const load = createTestLoad();
    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
        validate={(v) => (v === 1 ? "1은 선택할 수 없습니다" : undefined)}
      />
    ));

    await findByText("Apple");

    const hiddenInput = container.querySelector("input[type='text']") as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.validationMessage).toBe("1은 선택할 수 없습니다");
  });

  it("sets disabled attributes correctly", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        disabled
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("[role='combobox']") as HTMLElement;
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    expect(trigger.tabIndex).toBe(-1);
  });

  it("sets required aria attribute", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        required
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("[role='combobox']") as HTMLElement;
    expect(trigger.getAttribute("aria-required")).toBe("true");
  });

  it("opens modal on Enter key press", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        onValueChange={onValueChange}
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [3] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("[role='combobox']") as HTMLElement;
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='modal-confirm']",
      ) as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(3);
    });
  });

  it("handles async load function", async () => {
    const asyncLoad = vi.fn(async (keys: number[]) => {
      await new Promise((r) => setTimeout(r, 10));
      return testItems.filter((item) => keys.includes(item.id));
    });

    const { findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={2}
        load={asyncLoad}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const el = await findByText("Banana");
    expect(el).toBeTruthy();
    expect(asyncLoad).toHaveBeenCalledWith([2]);
  });

  it("hides clear button when no value", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const clearBtn = container.querySelector("[data-clear-button]");
    expect(clearBtn).toBeNull();
  });

  it("hides clear button when disabled even with value", async () => {
    const load = createTestLoad();
    const { container, findByText } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        disabled
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");
    const clearBtn = container.querySelector("[data-clear-button]");
    expect(clearBtn).toBeNull();
  });

  it("injects selectMode and selectedKeys into modal component", async () => {
    const load = createTestLoad();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        multiple
        load={load}
        modal={{ component: TestModalComponent, props: { confirmKeys: [] } }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const selectMode = document.querySelector("[data-testid='select-mode']");
      expect(selectMode?.textContent).toBe("multiple");

      const selectedKeys = document.querySelector("[data-testid='selected-keys']");
      expect(selectedKeys?.textContent).toBe("[1]");
    });
  });
});
