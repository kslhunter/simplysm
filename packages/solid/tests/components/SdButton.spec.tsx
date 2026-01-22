import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { SdButton } from "../../src/components/SdButton";

describe("SdButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("기본 렌더링", () => {
    const { getByRole } = render(() => <SdButton>테스트 버튼</SdButton>);
    const button = getByRole("button");

    expect(button).toBeDefined();
    expect(button.textContent).toBe("테스트 버튼");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("클릭 이벤트 핸들링", () => {
    const handleClick = vi.fn();
    const { getByRole } = render(() => <SdButton onClick={handleClick}>클릭</SdButton>);

    fireEvent.click(getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 상태에서 클릭 이벤트 비활성", () => {
    const handleClick = vi.fn();
    const { getByRole } = render(() => (
      <SdButton disabled onClick={handleClick}>
        비활성
      </SdButton>
    ));

    const button = getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("theme prop 적용", () => {
    const { getByRole } = render(() => <SdButton theme="primary">Primary</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("bg-blue-500");
  });

  it("size prop 적용", () => {
    const { getByRole } = render(() => <SdButton size="sm">Small</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("px-2");
    expect(button.className).toContain("text-xs");
  });

  it("fullWidth={false} 적용", () => {
    const { getByRole } = render(() => <SdButton fullWidth={false}>Inline</SdButton>);
    const button = getByRole("button");

    expect(button.className).not.toContain("w-full");
  });

  it("커스텀 class 병합", () => {
    const { getByRole } = render(() => <SdButton class="custom-class">커스텀</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("custom-class");
  });

  it("type='submit' 적용", () => {
    const { getByRole } = render(() => <SdButton type="submit">제출</SdButton>);
    const button = getByRole("button");

    expect(button.getAttribute("type")).toBe("submit");
  });

  it("inset 스타일 적용", () => {
    const { getByRole } = render(() => <SdButton inset>Inset</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("border-none");
  });
});
