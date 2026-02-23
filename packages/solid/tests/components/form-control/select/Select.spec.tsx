import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Select } from "../../../../src/components/form-control/select/Select";

describe("Select 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("트리거가 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { getByText } = render(() => (
        <Select placeholder="선택하세요" renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByText("선택하세요")).not.toBeNull();
    });
  });

  describe("드롭다운 열기/닫기", () => {
    it("트리거 클릭 시 드롭다운이 열린다", async () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]");
        expect(dropdown).not.toBeNull();
        // 드롭다운 내용 확인
        const selectItem = dropdown?.querySelector("[data-select-item]");
        expect(selectItem).not.toBeNull();
      });
    });

    it("아이템 선택 시 값이 변경되고 드롭다운 닫힘이 트리거된다 (단일 선택)", async () => {
      const [value, setValue] = createSignal<string | undefined>();
      const { getByRole } = render(() => (
        <Select value={value()} onValueChange={setValue} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);

      // 값이 변경됨
      expect(value()).toBe("apple");
      // aria-expanded가 false가 됨 (닫힘 트리거됨)
      expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("단일 선택", () => {
    it("아이템 선택 시 onValueChange가 호출된다", async () => {
      const handleChange = vi.fn();
      const { getByRole } = render(() => (
        <Select onValueChange={handleChange} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);
      expect(handleChange).toHaveBeenCalledWith("apple");
    });

    it("선택된 값이 트리거에 표시된다", () => {
      const [value, setValue] = createSignal<string | undefined>("apple");

      const { getByRole } = render(() => (
        <Select value={value()} onValueChange={setValue} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox").textContent).toContain("apple");
    });
  });

  describe("다중 선택", () => {
    it("multiple 모드에서 여러 아이템 선택 가능", async () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getByRole } = render(() => (
        <Select<string>
          multiple
          value={value()}
          onValueChange={(v) => setValue(v)}
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItems = document.querySelectorAll("[data-select-item]");
      fireEvent.click(selectItems[0]);
      expect(value()).toEqual(["apple"]);

      fireEvent.click(selectItems[1]);
      expect(value()).toEqual(["apple", "banana"]);
    });

    it("다중 선택 모드에서 아이템 선택해도 드롭다운이 닫히지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select multiple renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const selectItem = document.querySelector("[data-select-item]") as HTMLElement;
      fireEvent.click(selectItem);

      // 드롭다운이 여전히 열려 있음
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });
  });

  describe("서브 컴포넌트", () => {
    it("Select.Action이 렌더링된다", () => {
      const handleClick = vi.fn();
      const { getByText } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Action onClick={handleClick}>+</Select.Action>
        </Select>
      ));

      expect(getByText("+")).not.toBeNull();
      fireEvent.click(getByText("+"));
      expect(handleClick).toHaveBeenCalled();
    });

    it("Select.Header가 드롭다운 상단에 렌더링된다", async () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Header>
            <div data-testid="header">헤더 영역</div>
          </Select.Header>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]");
        expect(dropdown).not.toBeNull();
        const header = dropdown?.querySelector("[data-testid='header']");
        expect(header).not.toBeNull();
        expect(header?.textContent).toBe("헤더 영역");
      });
    });
  });

  describe("disabled 상태", () => {
    it("disabled일 때 트리거 클릭이 동작하지 않는다", () => {
      const { getByRole } = render(() => (
        <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      expect(document.querySelector("[data-dropdown]")).toBeNull();
    });

    it("disabled일 때 aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => (
        <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("접근성", () => {
    it("role=combobox가 설정된다", () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("열림 시 aria-expanded=true", async () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      const trigger = getByRole("combobox");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
      });
    });
  });

  describe("검색 기능", () => {
    it("getSearchText가 있으면 검색 입력이 표시된다", async () => {
      const { getByRole } = render(() => (
        <Select
          items={["apple", "banana", "cherry"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        const searchInput = document.querySelector("[data-select-search]");
        expect(searchInput).not.toBeNull();
      });
    });

    it("검색어 입력 시 항목이 필터링된다", async () => {
      const { getByRole } = render(() => (
        <Select
          items={["apple", "banana", "cherry"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-search]")).not.toBeNull();
      });

      const searchInput = document.querySelector("[data-select-search]") as HTMLInputElement;
      fireEvent.input(searchInput, { target: { value: "ban" } });

      await waitFor(() => {
        const items = document.querySelectorAll("[data-select-item]");
        // 미지정 + banana = 2
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain("미지정");
        expect(items[1].textContent).toContain("banana");
      });
    });

    it("공백 분리 AND 매칭으로 검색한다", async () => {
      const { getByRole } = render(() => (
        <Select
          items={["red apple", "green apple", "banana"]}
          getSearchText={(item) => item}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-search]")).not.toBeNull();
      });

      const searchInput = document.querySelector("[data-select-search]") as HTMLInputElement;
      fireEvent.input(searchInput, { target: { value: "red apple" } });

      await waitFor(() => {
        const items = document.querySelectorAll("[data-select-item]");
        // 미지정 + red apple = 2
        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain("미지정");
        expect(items[1].textContent).toContain("red apple");
      });
    });

    it("getSearchText가 없으면 검색 입력이 표시되지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-select-search]")).toBeNull();
    });
  });

  describe("미지정 항목", () => {
    it("단일 선택 + required 아님 → '미지정' 항목이 표시된다", async () => {
      const { getByRole } = render(() => (
        <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // 미지정 + apple + banana = 3
      expect(items.length).toBe(3);
      expect(items[0].textContent).toContain("미지정");
    });

    it("required일 때는 '미지정' 항목이 표시되지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select items={["apple", "banana"]} required renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // apple + banana = 2 (미지정 없음)
      expect(items.length).toBe(2);
    });

    it("다중 선택에서는 '미지정' 항목이 표시되지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select multiple items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      // apple + banana = 2 (미지정 없음)
      expect(items.length).toBe(2);
    });
  });

  describe("전체선택/해제", () => {
    it("multiple 모드에서 전체선택/해제 버튼이 표시된다", async () => {
      const { getByRole } = render(() => (
        <Select multiple items={["apple", "banana", "cherry"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-all]")).not.toBeNull();
        expect(document.querySelector("[data-deselect-all]")).not.toBeNull();
      });
    });

    it("전체선택 클릭 시 모든 항목이 선택된다", async () => {
      const [value, setValue] = createSignal<string[]>([]);
      const { getByRole } = render(() => (
        <Select<string>
          multiple
          items={["apple", "banana", "cherry"]}
          value={value()}
          onValueChange={setValue}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-select-all]")).not.toBeNull();
      });

      const selectAllBtn = document.querySelector("[data-select-all]") as HTMLElement;
      fireEvent.click(selectAllBtn);

      expect(value()).toEqual(["apple", "banana", "cherry"]);
    });

    it("전체해제 클릭 시 모든 선택이 해제된다", async () => {
      const [value, setValue] = createSignal<string[]>(["apple", "banana"]);
      const { getByRole } = render(() => (
        <Select<string>
          multiple
          items={["apple", "banana", "cherry"]}
          value={value()}
          onValueChange={setValue}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-deselect-all]")).not.toBeNull();
      });

      const deselectAllBtn = document.querySelector("[data-deselect-all]") as HTMLElement;
      fireEvent.click(deselectAllBtn);

      expect(value()).toEqual([]);
    });

    it("hideSelectAll일 때 전체선택/해제 버튼이 표시되지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select multiple hideSelectAll items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-select-all]")).toBeNull();
      expect(document.querySelector("[data-deselect-all]")).toBeNull();
    });

    it("단일 선택 모드에서는 전체선택/해제 버튼이 표시되지 않는다", async () => {
      const { getByRole } = render(() => (
        <Select items={["apple", "banana"]} renderValue={(v) => <>{v}</>}>
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      expect(document.querySelector("[data-select-all]")).toBeNull();
    });
  });

  describe("숨김 처리", () => {
    it("getIsHidden이 true인 항목은 목록에서 숨겨진다", async () => {
      const { getByRole } = render(() => (
        <Select
          items={["apple", "banana", "cherry"]}
          getIsHidden={(item) => item === "banana"}
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      const texts = Array.from(items).map((el) => el.textContent);
      // 미지정 + apple + cherry (banana 숨김)
      expect(texts).toContain("미지정");
      expect(texts.some((t) => t.includes("apple"))).toBe(true);
      expect(texts.some((t) => t.includes("cherry"))).toBe(true);
      expect(texts.some((t) => t.includes("banana"))).toBe(false);
    });

    it("숨김 항목이지만 선택된 경우 취소선으로 표시된다", async () => {
      const { getByRole } = render(() => (
        <Select
          items={["apple", "banana", "cherry"]}
          getIsHidden={(item) => item === "banana"}
          value="banana"
          renderValue={(v) => <>{v}</>}
        >
          <Select.ItemTemplate>{(item) => <>{item}</>}</Select.ItemTemplate>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      const items = document.querySelectorAll("[data-select-item]");
      const bananaItem = Array.from(items).find((el) => el.textContent.includes("banana"));
      expect(bananaItem).not.toBeNull();
      // 취소선 스타일 확인
      expect(bananaItem!.classList.contains("line-through")).toBe(true);
    });
  });

  describe("validation", () => {
    it("required일 때 값이 없으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <Select required value={undefined} renderValue={(v) => <>{v}</>}>
          <Select.Item value="a">Option A</Select.Item>
        </Select>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("required일 때 값이 있으면 유효하다", () => {
      const { container } = render(() => (
        <Select required value="a" renderValue={(v) => <>{v}</>}>
          <Select.Item value="a">Option A</Select.Item>
        </Select>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("validate 함수가 에러를 반환하면 해당 메시지가 설정된다", () => {
      const { container } = render(() => (
        <Select
          validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
          value="invalid-val"
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="invalid-val">Invalid</Select.Item>
        </Select>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("허용되지 않는 값입니다");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => (
        <Select
          validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
          value="valid-val"
          renderValue={(v) => <>{v}</>}
        >
          <Select.Item value="valid-val">Valid</Select.Item>
        </Select>
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
