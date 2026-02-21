import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Combobox } from "../../../../src/components/form-control/combobox/Combobox";

describe("Combobox 컴포넌트", () => {
  const mockLoadItems = vi.fn(() => Promise.resolve([]));

  beforeEach(() => {
    mockLoadItems.mockClear();
  });

  describe("기본 렌더링", () => {
    it("트리거가 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Combobox loadItems={mockLoadItems} renderValue={(v) => <>{v}</>} />
      ));
      expect(getByRole("combobox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { container } = render(() => (
        <Combobox
          loadItems={mockLoadItems}
          placeholder="검색하세요"
          renderValue={(v) => <>{v}</>}
        />
      ));
      const input = container.querySelector("input");
      expect(input?.getAttribute("placeholder")).toBe("검색하세요");
    });

    it("input의 autocomplete 기본값은 one-time-code이다", () => {
      const { container } = render(() => (
        <Combobox loadItems={mockLoadItems} renderValue={(v) => <>{v}</>} />
      ));
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.autocomplete).toBe("one-time-code");
    });

    it("disabled일 때 aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => (
        <Combobox loadItems={mockLoadItems} disabled renderValue={(v) => <>{v}</>} />
      ));
      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("드롭다운 열기/닫기", () => {
    it("입력 시 드롭다운이 열린다", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container } = render(() => (
        <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });
    });

    it("아이템 선택 시 드롭다운이 닫힌다", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container, getByRole } = render(() => (
        <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
      });

      const item = document.querySelector("[data-combobox-item]") as HTMLElement;
      fireEvent.click(item);

      await waitFor(() => {
        expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
      });
    });

    it("Escape 키로 드롭다운이 닫힌다", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));
      const { container, getByRole } = render(() => (
        <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.keyDown(getByRole("combobox"), { key: "Escape" });

      await waitFor(() => {
        expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
      });
    });
  });

  describe("값 선택", () => {
    it("아이템 선택 시 onValueChange가 호출된다", async () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "사과" }]));

      const { container } = render(() => (
        <Combobox
          loadItems={loadItems}
          onValueChange={handleChange}
          renderValue={(v: { name: string }) => <>{v.name}</>}
        />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "사" } });

      await waitFor(() => {
        expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
      });

      const item = document.querySelector("[data-combobox-item]") as HTMLElement;
      fireEvent.click(item);

      expect(handleChange).toHaveBeenCalledWith({ id: 1, name: "사과" });
    });
  });

  describe("디바운스", () => {
    it("입력 후 디바운스 시간이 지나면 loadItems가 호출된다", async () => {
      const loadItems = vi.fn(() => Promise.resolve([{ id: 1, name: "결과" }]));

      const { container } = render(() => (
        <Combobox
          loadItems={loadItems}
          debounceMs={50}
          renderValue={(v: { name: string }) => <>{v.name}</>}
        />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "검색어" } });

      // 디바운스 후 loadItems가 호출됨
      await waitFor(
        () => {
          expect(loadItems).toHaveBeenCalledWith("검색어");
        },
        { timeout: 200 },
      );
    });
  });

  describe("allowCustomValue", () => {
    it("allowCustomValue가 true일 때 Enter로 커스텀 값 입력 가능", () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([]));

      const { container, getByRole } = render(() => (
        <Combobox
          loadItems={loadItems}
          onValueChange={handleChange}
          allowCustomValue
          renderValue={(v) => <>{v}</>}
        />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "새로운 값" } });
      fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

      expect(handleChange).toHaveBeenCalledWith("새로운 값");
    });

    it("parseCustomValue로 커스텀 값을 변환할 수 있다", () => {
      const handleChange = vi.fn();
      const loadItems = vi.fn(() => Promise.resolve([]));

      const { container, getByRole } = render(() => (
        <Combobox
          loadItems={loadItems}
          onValueChange={handleChange}
          allowCustomValue
          parseCustomValue={(text) => ({ name: text, custom: true })}
          renderValue={(v: { name: string }) => <>{v.name}</>}
        />
      ));

      const input = container.querySelector("input")!;
      fireEvent.input(input, { target: { value: "테스트" } });
      fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

      expect(handleChange).toHaveBeenCalledWith({ name: "테스트", custom: true });
    });
  });

  describe("validation", () => {
    it("required일 때 값이 없으면 에러 메시지가 설정된다", () => {
      const { container } = render(() => (
        <Combobox
          loadItems={mockLoadItems}
          required
          value={undefined}
          renderValue={(v) => <>{v}</>}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("필수 입력 항목입니다");
    });

    it("required일 때 값이 있으면 유효하다", () => {
      const { container } = render(() => (
        <Combobox
          loadItems={mockLoadItems}
          required
          value="선택된 값"
          renderValue={(v) => <>{v}</>}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });

    it("validate 함수가 에러를 반환하면 해당 메시지가 설정된다", () => {
      const { container } = render(() => (
        <Combobox
          loadItems={mockLoadItems}
          validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
          value="invalid-val"
          renderValue={(v) => <>{v}</>}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validationMessage).toBe("허용되지 않는 값입니다");
    });

    it("validate 함수가 undefined를 반환하면 유효하다", () => {
      const { container } = render(() => (
        <Combobox
          loadItems={mockLoadItems}
          validate={(v) => (v === "invalid-val" ? "허용되지 않는 값입니다" : undefined)}
          value="valid-val"
          renderValue={(v) => <>{v}</>}
        />
      ));
      const hiddenInput = container.querySelector("input[aria-hidden='true']") as HTMLInputElement;
      expect(hiddenInput.validity.valid).toBe(true);
    });
  });
});
