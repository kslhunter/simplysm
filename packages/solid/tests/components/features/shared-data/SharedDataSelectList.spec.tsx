import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SharedDataSelectList } from "@simplysm/solid";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";

// SharedDataAccessor mock factory
function createMockAccessor<T>(
  items: T[],
  options?: {
    getIsHidden?: (item: T) => boolean;
    getSearchText?: (item: T) => string;
  },
) {
  const [itemsSignal] = createSignal(items);
  return {
    items: itemsSignal,
    get: (key: string | number | undefined) => items.find((_, i) => i === Number(key)),
    emit: vi.fn(),
    getKey: (item: T) => items.indexOf(item),
    getIsHidden: options?.getIsHidden,
    getSearchText: options?.getSearchText,
  };
}

// DialogProvider wrapper
function renderWithDialog(ui: () => import("solid-js").JSX.Element) {
  return render(() => <DialogProvider>{ui()}</DialogProvider>);
}

describe("SharedDataSelectList", () => {
  afterEach(() => {
    cleanup();
  });

  // ─── Item Rendering ─────────────────────────────────────

  describe("item rendering", () => {
    it("items are rendered as List.Item", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();
    });

    it("children render function receives item and index", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item, index) => <>{`${index}:${item}`}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("0:A")).toBeTruthy();
      expect(screen.getByText("1:B")).toBeTruthy();
    });
  });

  // ─── Selection/Toggle ─────────────────────────────────────────

  describe("selection/toggle", () => {
    it("onValueChange is called when an item is clicked", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).toHaveBeenCalledWith("Banana");
    });

    it("re-clicking already selected item deselects it (when not required)", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("re-clicking does not deselect when required", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith("Apple");
    });

    it("click is ignored when disabled", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} disabled required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ─── Unspecified Item ───────────────────────────────────────

  describe("unspecified item", () => {
    it("Unspecified item is displayed when not required", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor}>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Unspecified")).toBeTruthy();
    });

    it("Unspecified item is not displayed when required", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("Unspecified")).toBeNull();
    });

    it("clicking Unspecified changes value to undefined", () => {
      const accessor = createMockAccessor(["Apple"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Unspecified"));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  // ─── canChange Guard ────────────────────────────────────

  describe("canChange guard", () => {
    it("change is blocked when canChange returns false", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => false}
          required
        >
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));

      // canChange is async, wait a tick to ensure handler completes
      await new Promise((r) => setTimeout(r, 50));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("change is allowed when canChange returns true", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => true}
          required
        >
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith("Banana");
      });
    });
  });

  // ─── Pagination ──────────────────────────────────────

  describe("pagination", () => {
    it("items are displayed per page when pageSize is set", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toContain("Item 1");
    });

    it("page switching works with Pagination component", async () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("2"));

      await vi.waitFor(() => {
        const listItems = screen.getAllByRole("treeitem");
        expect(listItems[0]?.textContent).toContain("Item 4");
      });
    });

    it("Pagination is not displayed when total items are within pageSize", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={5} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(document.querySelector("[data-pagination]")).toBeNull();
    });
  });

  // ─── Filtering ────────────────────────────────────────────

  describe("filtering", () => {
    it("items hidden by getIsHidden are not displayed", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"], {
        getIsHidden: (item) => item === "Banana",
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("Banana")).toBeNull();
      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();
    });

    it("only items filtered by filterFn are displayed", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} filterFn={(item) => item.startsWith("B")} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.queryByText("Apple")).toBeNull();
      expect(screen.queryByText("Cherry")).toBeNull();
    });
  });

  // ─── header / modal ────────────────────────────────────

  describe("header / modal", () => {
    it("header text is displayed when header is provided", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일 목록" required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      expect(screen.getByText("과일 목록")).toBeTruthy();
    });

    it("management button is displayed when modal is provided", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일" modal={() => <div>Modal</div>} required>
          <SharedDataSelectList.ItemTemplate>{(item) => <>{item}</>}</SharedDataSelectList.ItemTemplate>
        </SharedDataSelectList>
      ));

      // Button is rendered (with IconExternalLink)
      const headerArea = screen.getByText("과일").parentElement!;
      const button = headerArea.querySelector("button");
      expect(button).toBeTruthy();
    });
  });
});
