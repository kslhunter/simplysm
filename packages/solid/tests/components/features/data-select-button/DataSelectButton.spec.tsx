import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { DataSelectButton, type SelectDialogBaseProps } from "@simplysm/solid";
import { DialogProvider } from "../../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../../src/providers/i18n/I18nProvider";
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

// Full props type for the test dialog component
type TestDialogComponentProps = SelectDialogBaseProps<number> & { confirmKeys: number[] };

// Dialog component for tests — uses close prop directly
function TestDialogComponent(props: TestDialogComponentProps) {
  return (
    <div data-testid="dialog-content">
      <div data-testid="select-mode">{props.selectionMode}</div>
      <div data-testid="selected-keys">{JSON.stringify([...props.selectedKeys])}</div>
      <button data-testid="dialog-confirm" onClick={() => props.close?.({ selectedKeys: props.confirmKeys })}>
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
      <DataSelectButton<TestItem, number, TestDialogComponentProps>
        value={[1, 3]}
        multiple
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
      <DataSelectButton<TestItem, number, TestDialogComponentProps>
        value={[1, 2]}
        multiple
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]");
    expect(searchBtn).not.toBeNull();
  });

  it("opens dialog on search button click and applies result for single select", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [2] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    // once dialog opens, find and click confirm button
    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='dialog-confirm']",
      ) as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(2);
    });
  });

  it("opens dialog and applies result for multiple select", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton<TestItem, number, TestDialogComponentProps>
        multiple
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [1, 3] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='dialog-confirm']",
      ) as HTMLButtonElement;
      expect(confirmBtn).not.toBeNull();
      confirmBtn.click();
    });

    await vi.waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith([1, 3]);
    });
  });

  it("does not change value when dialog is cancelled", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        value={1}
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [2] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      const dialogContent = document.querySelector("[data-testid='dialog-content']");
      expect(dialogContent).not.toBeNull();
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("button[data-trigger]") as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
  });

  it("sets required aria attribute", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        required
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("button[data-trigger]") as HTMLElement;
    expect(trigger.getAttribute("aria-required")).toBe("true");
  });

  it("trigger is a button element with aria-haspopup='dialog'", () => {
    const load = createTestLoad();
    const { container } = renderWithDialog(() => (
      <DataSelectButton
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("button[data-trigger]") as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("type")).toBe("button");
  });

  it("aria-expanded changes dynamically with dialog open state", async () => {
    const load = createTestLoad();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [1] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("button[data-trigger]") as HTMLButtonElement;

    // Initially false
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // Open dialog via search button
    const searchBtn = container.querySelector("[data-search-button]") as HTMLButtonElement;
    searchBtn.click();

    // While dialog is open, aria-expanded should be true
    await vi.waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    // Confirm dialog to close it
    const confirmBtn = document.querySelector(
      "[data-testid='dialog-confirm']",
    ) as HTMLButtonElement;
    confirmBtn.click();

    // After dialog closes, aria-expanded should be false again
    await vi.waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("opens dialog on trigger click", async () => {
    const load = createTestLoad();
    const onValueChange = vi.fn();

    const { container } = renderWithDialog(() => (
      <DataSelectButton
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [3] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    const trigger = container.querySelector("button[data-trigger]") as HTMLElement;
    trigger.click();

    await vi.waitFor(() => {
      const confirmBtn = document.querySelector(
        "[data-testid='dialog-confirm']",
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));

    await findByText("Apple");
    const clearBtn = container.querySelector("[data-clear-button]");
    expect(clearBtn).toBeNull();
  });

  it("injects selectMode and selectedKeys into dialog component", async () => {
    const load = createTestLoad();

    const { container } = renderWithDialog(() => (
      <DataSelectButton<TestItem, number, TestDialogComponentProps>
        value={[1]}
        multiple
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
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

describe("DataSelectButton type safety", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  afterEach(() => {
    cleanup();
  });

  it("single mode types value as TKey", () => {
    const load = createTestLoad();
    // Single mode: value is number, onValueChange receives number | undefined
    const onValueChange = vi.fn<(v: number | undefined) => void>();
    renderWithDialog(() => (
      <DataSelectButton
        value={1}
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));
    // If this compiles, single mode type is correct
    expect(true).toBe(true);
  });

  it("multiple mode types value as TKey[]", () => {
    const load = createTestLoad();
    // Multiple mode: value is number[], onValueChange receives number[]
    const onValueChange = vi.fn<(v: number[]) => void>();
    renderWithDialog(() => (
      <DataSelectButton<TestItem, number, TestDialogComponentProps>
        multiple
        value={[1, 2]}
        onValueChange={onValueChange}
        load={load}
        dialog={TestDialogComponent}
        dialogProps={{ confirmKeys: [] }}
        renderItem={(item: TestItem) => <span>{item.name}</span>}
      />
    ));
    expect(true).toBe(true);
  });
});
