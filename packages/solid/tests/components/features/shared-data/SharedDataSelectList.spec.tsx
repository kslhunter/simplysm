import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SharedDataSelectList } from "@simplysm/solid";
import { DialogProvider } from "../../../../src/components/disclosure/DialogProvider";

// SharedDataAccessor mock 팩토리
function createMockAccessor<T>(
  items: T[],
  options?: {
    getIsHidden?: (item: T) => boolean;
  },
) {
  const [itemsSignal] = createSignal(items);
  return {
    items: itemsSignal,
    get: (key: string | number | undefined) => items.find((_, i) => i === Number(key)),
    emit: vi.fn(),
    getKey: (item: T) => items.indexOf(item),
    getIsHidden: options?.getIsHidden,
  };
}

// DialogProvider 래퍼
function renderWithDialog(ui: () => import("solid-js").JSX.Element) {
  return render(() => <DialogProvider>{ui()}</DialogProvider>);
}

describe("SharedDataSelectList", () => {
  afterEach(() => {
    cleanup();
  });

  // ─── 아이템 렌더링 ─────────────────────────────────────

  describe("아이템 렌더링", () => {
    it("items가 List.Item으로 렌더링된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();
    });

    it("children render function에 item과 index가 전달된다", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item, index) => <>{`${index}:${item}`}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("0:A")).toBeTruthy();
      expect(screen.getByText("1:B")).toBeTruthy();
    });
  });

  // ─── 선택/토글 ─────────────────────────────────────────

  describe("선택/토글", () => {
    it("아이템 클릭 시 onValueChange가 호출된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).toHaveBeenCalledWith("Banana");
    });

    it("이미 선택된 아이템 재클릭 시 선택 해제 (required가 아닐 때)", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("required일 때 재클릭해도 선택 해제되지 않는다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith("Apple");
    });

    it("disabled일 때 클릭이 무시된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} disabled required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ─── 미지정 항목 ───────────────────────────────────────

  describe("미지정 항목", () => {
    it("required가 아니면 미지정 항목이 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor}>{(item) => <>{item}</>}</SharedDataSelectList>
      ));

      expect(screen.getByText("미지정")).toBeTruthy();
    });

    it("required이면 미지정 항목이 표시되지 않는다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("미지정")).toBeNull();
    });

    it("미지정 클릭 시 undefined로 변경된다", () => {
      const accessor = createMockAccessor(["Apple"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("미지정"));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });

  // ─── canChange 가드 ────────────────────────────────────

  describe("canChange 가드", () => {
    it("canChange가 false를 반환하면 변경 차단", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => false}
          required
        >
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));

      // canChange is async, wait a tick to ensure handler completes
      await new Promise((r) => setTimeout(r, 50));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("canChange가 true를 반환하면 변경 허용", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => true}
          required
        >
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith("Banana");
      });
    });
  });

  // ─── 페이지네이션 ──────────────────────────────────────

  describe("페이지네이션", () => {
    it("pageSize가 있으면 항목이 페이지 단위로 표시된다", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toContain("Item 1");
    });

    it("Pagination 컴포넌트로 페이지 전환이 동작한다", async () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("2"));

      await vi.waitFor(() => {
        const listItems = screen.getAllByRole("treeitem");
        expect(listItems[0]?.textContent).toContain("Item 4");
      });
    });

    it("총 항목이 pageSize 이하이면 Pagination이 표시되지 않는다", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={5} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(document.querySelector("[data-pagination]")).toBeNull();
    });
  });

  // ─── 필터링 ────────────────────────────────────────────

  describe("필터링", () => {
    it("getIsHidden으로 숨겨진 항목은 표시되지 않는다", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"], {
        getIsHidden: (item) => item === "Banana",
      });

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("Banana")).toBeNull();
      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();
    });

    it("filterFn으로 필터링된 항목만 표시된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} filterFn={(item) => item.startsWith("B")} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.queryByText("Apple")).toBeNull();
      expect(screen.queryByText("Cherry")).toBeNull();
    });
  });

  // ─── header / modal ────────────────────────────────────

  describe("header / modal", () => {
    it("header가 있으면 헤더 텍스트가 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일 목록" required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("과일 목록")).toBeTruthy();
    });

    it("modal이 있으면 관리 버튼이 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일" modal={() => <div>Modal</div>} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      // Button이 렌더링됨 (IconExternalLink 포함)
      const headerArea = screen.getByText("과일").parentElement!;
      const button = headerArea.querySelector("button");
      expect(button).toBeTruthy();
    });
  });
});
