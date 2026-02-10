import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Combobox } from "../../../../src/components/form-control/combobox/Combobox";

describe("Combobox 컴포넌트", () => {
  const mockLoadItems = vi.fn(async () => []);

  beforeEach(() => {
    mockLoadItems.mockClear();
  });

  describe("기본 렌더링", () => {
    it("트리거가 렌더링된다", () => {
      const { getByRole } = render(() => <Combobox loadItems={mockLoadItems} renderValue={(v) => <>{v}</>} />);
      expect(getByRole("combobox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { container } = render(() => (
        <Combobox loadItems={mockLoadItems} placeholder="검색하세요" renderValue={(v) => <>{v}</>} />
      ));
      const input = container.querySelector("input");
      expect(input?.getAttribute("placeholder")).toBe("검색하세요");
    });

    it("disabled일 때 aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => <Combobox loadItems={mockLoadItems} disabled renderValue={(v) => <>{v}</>} />);
      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });
});
