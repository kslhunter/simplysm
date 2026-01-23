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

  it("theme prop 적용 - filled 테마", () => {
    const { getByRole } = render(() => <SdButton theme="primary">Primary</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("bg-primary");
  });

  it("theme prop 적용 - link 테마", () => {
    const { getByRole } = render(() => <SdButton theme="link-primary">Link</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("text-primary");
  });

  it("size prop 미지정 시 기본값 적용", () => {
    const { getByRole } = render(() => <SdButton>Default Size</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("px-3");
    expect(button.className).toContain("py-1.5");
  });

  it("size prop 적용 - sm", () => {
    const { getByRole } = render(() => <SdButton size="sm">Small</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("px-2");
    expect(button.className).toContain("text-xs");
  });

  it("size prop 적용 - lg", () => {
    const { getByRole } = render(() => <SdButton size="lg">Large</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("px-4");
    expect(button.className).toContain("text-base");
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
    expect(button.className).toContain("rounded-none");
  });

  it("inset + theme 미지정 시 link-primary 테마 자동 적용", () => {
    const { getByRole } = render(() => <SdButton inset>Inset Default</SdButton>);
    const button = getByRole("button");

    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("text-primary");
  });

  it("inset + theme 명시 시 명시된 테마 유지 (primary)", () => {
    const { getByRole } = render(() => (
      <SdButton inset theme="primary">
        Inset Primary
      </SdButton>
    ));
    const button = getByRole("button");

    expect(button.className).toContain("bg-primary");
    expect(button.className).not.toContain("bg-transparent");
  });

  it("inset + theme='default' 명시 시에도 link-primary로 변환", () => {
    const { getByRole } = render(() => (
      <SdButton inset theme="default">
        Inset Default Explicit
      </SdButton>
    ));
    const button = getByRole("button");

    // theme="default"를 명시해도 inset일 경우 link-primary로 변환됨
    expect(button.className).toContain("bg-transparent");
    expect(button.className).toContain("text-primary");
  });
});
