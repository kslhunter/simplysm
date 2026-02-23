import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SelectList } from "@simplysm/solid";

describe("SelectList", () => {
  // ─── 검색 필터링 ───────────────────────────────────────

  describe("검색 필터링", () => {
    it("getSearchText가 있으면 검색 입력란이 표시된다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} getSearchText={(item) => item} />);

      const input = screen.getByPlaceholderText("검색...");
      expect(input).toBeTruthy();

      cleanup();
    });

    it("getSearchText가 없으면 검색 입력란이 표시되지 않는다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} />);

      const input = screen.queryByPlaceholderText("검색...");
      expect(input).toBeNull();

      cleanup();
    });

    it("검색어 입력 시 일치하는 항목만 표시된다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} getSearchText={(item) => item} />);

      const input = screen.getByPlaceholderText("검색...");
      fireEvent.input(input, { target: { value: "an" } });

      // "Banana"만 "an"을 포함
      const listItems = screen.getAllByRole("treeitem");
      const textContents = listItems.map((el) => el.textContent);

      expect(textContents).toContain("Banana");
      expect(textContents).not.toContain("Apple");
      expect(textContents).not.toContain("Cherry");

      cleanup();
    });

    it("검색은 대소문자를 구분하지 않는다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} getSearchText={(item) => item} />);

      const input = screen.getByPlaceholderText("검색...");
      fireEvent.input(input, { target: { value: "APPLE" } });

      const listItems = screen.getAllByRole("treeitem");
      const textContents = listItems.map((el) => el.textContent);

      expect(textContents).toContain("Apple");
      expect(textContents).not.toContain("Banana");

      cleanup();
    });
  });

  // ─── 페이지네이션 ─────────────────────────────────────

  describe("페이지네이션", () => {
    it("pageSize가 있으면 항목이 페이지 단위로 표시된다", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

      render(() => <SelectList items={items} pageSize={3} required />);

      // 첫 페이지: 3개 항목만 표시
      const listItems = screen.getAllByRole("treeitem");
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toBe("Item 1");
      expect(listItems[2]?.textContent).toBe("Item 3");

      cleanup();
    });

    it("pageSize가 없으면 모든 항목이 표시된다", () => {
      const items = Array.from({ length: 5 }, (_, i) => `Item ${i + 1}`);

      render(() => <SelectList items={items} required />);

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems.length).toBe(5);

      cleanup();
    });

    it("Pagination 컴포넌트가 표시되고 페이지 전환이 동작한다", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

      render(() => <SelectList items={items} pageSize={3} required />);

      // Pagination nav가 표시되는지 확인
      const nav = document.querySelector("[data-pagination]");
      expect(nav).toBeTruthy();

      // 페이지 2 버튼 클릭
      const page2Btn = screen.getByText("2");
      fireEvent.click(page2Btn);

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems[0]?.textContent).toBe("Item 4");
      expect(listItems[2]?.textContent).toBe("Item 6");

      cleanup();
    });

    it("총 항목이 pageSize 이하이면 Pagination이 표시되지 않는다", () => {
      const items = ["A", "B"];

      render(() => <SelectList items={items} pageSize={5} required />);

      const nav = document.querySelector("[data-pagination]");
      expect(nav).toBeNull();

      cleanup();
    });
  });

  // ─── 선택/토글 + canChange 가드 ──────────────────────

  describe("선택/토글", () => {
    it("아이템 클릭 시 onValueChange가 호출된다", () => {
      const items = ["Apple", "Banana", "Cherry"];
      const onChange = vi.fn();

      render(() => <SelectList items={items} onValueChange={onChange} required />);

      const bananaItem = screen.getByText("Banana");
      fireEvent.click(bananaItem);

      expect(onChange).toHaveBeenCalledWith("Banana");

      cleanup();
    });

    it("이미 선택된 아이템을 다시 클릭하면 선택 해제된다 (required가 아닐 때)", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => <SelectList items={items} value="Apple" onValueChange={onChange} />);

      const appleItem = screen.getByText("Apple");
      fireEvent.click(appleItem);

      expect(onChange).toHaveBeenCalledWith(undefined);

      cleanup();
    });

    it("required일 때 이미 선택된 아이템을 다시 클릭해도 선택 해제되지 않는다", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => <SelectList items={items} value="Apple" onValueChange={onChange} required />);

      const appleItem = screen.getByText("Apple");
      fireEvent.click(appleItem);

      // required이므로 같은 값으로 다시 호출됨 (해제 아님)
      expect(onChange).toHaveBeenCalledWith("Apple");

      cleanup();
    });

    it("미지정 항목 클릭 시 undefined로 변경된다", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => <SelectList items={items} value="Apple" onValueChange={onChange} />);

      const unsetItem = screen.getByText("미지정");
      fireEvent.click(unsetItem);

      expect(onChange).toHaveBeenCalledWith(undefined);

      cleanup();
    });

    it("required일 때 미지정 항목이 표시되지 않는다", () => {
      const items = ["Apple", "Banana"];

      render(() => <SelectList items={items} required />);

      const unsetItem = screen.queryByText("미지정");
      expect(unsetItem).toBeNull();

      cleanup();
    });

    it("canChange가 false를 반환하면 값이 변경되지 않는다", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => (
        <SelectList items={items} onValueChange={onChange} canChange={() => false} required />
      ));

      const bananaItem = screen.getByText("Banana");
      fireEvent.click(bananaItem);

      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });

    it("canChange가 true를 반환하면 값이 변경된다", async () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => (
        <SelectList items={items} onValueChange={onChange} canChange={() => true} required />
      ));

      const bananaItem = screen.getByText("Banana");
      fireEvent.click(bananaItem);

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith("Banana");
      });

      cleanup();
    });

    it("canChange가 Promise<false>를 반환하면 값이 변경되지 않는다", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => (
        <SelectList
          items={items}
          onValueChange={onChange}
          canChange={() => Promise.resolve(false)}
          required
        />
      ));

      const bananaItem = screen.getByText("Banana");
      fireEvent.click(bananaItem);

      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });

    it("disabled일 때 아이템 클릭이 무시된다", () => {
      const items = ["Apple", "Banana"];
      const onChange = vi.fn();

      render(() => <SelectList items={items} onValueChange={onChange} disabled required />);

      const bananaItem = screen.getByText("Banana");
      fireEvent.click(bananaItem);

      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });
  });

  // ─── items 변경 시 value 재매칭 ──────────────────────

  describe("items 변경 시 value 재매칭", () => {
    it("items가 변경되어도 value가 동일 참조로 유지된다", () => {
      const item1 = { id: 1, name: "Apple" };
      const item2 = { id: 2, name: "Banana" };
      const onChange = vi.fn();

      const App = () => {
        const [items, setItems] = createSignal([item1, item2]);

        return (
          <div>
            <SelectList items={items()} value={item1} onValueChange={onChange} required>
              <SelectList.ItemTemplate>
                {(item: { id: number; name: string }) => <>{item.name}</>}
              </SelectList.ItemTemplate>
            </SelectList>
            <button data-testid="update" onClick={() => setItems([item1, item2])}>
              Update
            </button>
          </div>
        );
      };

      render(() => <App />);

      // items를 같은 참조로 업데이트
      const updateBtn = screen.getByTestId("update");
      fireEvent.click(updateBtn);

      // 선택된 값은 그대로 유지 (onChange 호출 없음)
      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });
  });

  // ─── 필터 조합 ────────────────────────────────────────

  describe("필터 조합", () => {
    it("getIsHidden으로 숨겨진 항목은 표시되지 않는다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} getIsHidden={(item) => item === "Banana"} required />);

      const listItems = screen.getAllByRole("treeitem");
      const textContents = listItems.map((el) => el.textContent);

      expect(textContents).toContain("Apple");
      expect(textContents).not.toContain("Banana");
      expect(textContents).toContain("Cherry");

      cleanup();
    });

    it("filterFn으로 필터링된 항목만 표시된다", () => {
      const items = ["Apple", "Banana", "Cherry"];

      render(() => <SelectList items={items} filterFn={(item) => item.startsWith("B")} required />);

      const listItems = screen.getAllByRole("treeitem");
      const textContents = listItems.map((el) => el.textContent);

      expect(textContents).toContain("Banana");
      expect(textContents).not.toContain("Apple");
      expect(textContents).not.toContain("Cherry");

      cleanup();
    });

    it("header prop이 전달되면 헤더 텍스트가 표시된다", () => {
      const items = ["Apple"];

      render(() => <SelectList items={items} header="과일 목록" required />);

      expect(screen.getByText("과일 목록")).toBeTruthy();

      cleanup();
    });
  });
});
