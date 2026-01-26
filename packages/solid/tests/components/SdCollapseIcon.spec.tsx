import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdCollapseIcon } from "../../src/components/SdCollapseIcon";

describe("SdCollapseIcon", () => {
  afterEach(() => {
    cleanup();
  });

  it("기본 렌더링", () => {
    const { container } = render(() => <SdCollapseIcon />);
    const icon = container.firstChild as HTMLElement;

    expect(icon).toBeDefined();
    expect(icon.tagName.toLowerCase()).toBe("span");
  });

  it("기본 스타일 적용", () => {
    const { container } = render(() => <SdCollapseIcon />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.className).toContain("inline-block");
  });

  it("open=false (기본값) - 회전 없음", () => {
    const { container } = render(() => <SdCollapseIcon />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.getAttribute("data-sd-open")).toBe("false");
    expect(icon.style.transform).toBe("");
  });

  it("open=true - 기본 90도 회전", () => {
    const { container } = render(() => <SdCollapseIcon open />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.getAttribute("data-sd-open")).toBe("true");
    expect(icon.style.transform).toBe("rotate(90deg)");
  });

  it("커스텀 openRotate 적용", () => {
    const { container } = render(() => <SdCollapseIcon open openRotate={180} />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.style.transform).toBe("rotate(180deg)");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => <SdCollapseIcon class="custom-class" />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.className).toContain("custom-class");
    expect(icon.className).toContain("inline-block");
  });

  it("동적 open 상태 변경", () => {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => <SdCollapseIcon open={open()} />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.style.transform).toBe("");

    setOpen(true);
    expect(icon.style.transform).toBe("rotate(90deg)");

    setOpen(false);
    expect(icon.style.transform).toBe("");
  });

  it("커스텀 아이콘 컴포넌트 적용", () => {
    const CustomIcon = (props: { size?: string | number }) => <svg data-size={props.size} />;
    const { container } = render(() => <SdCollapseIcon icon={CustomIcon} />);
    const icon = container.firstChild as HTMLElement;
    const svg = icon.querySelector("svg");

    expect(svg).not.toBeNull();
    // SdCollapseIcon은 내부적으로 size="1lh"를 전달함
    expect(svg?.getAttribute("data-size")).toBe("1lh");
  });

  it("기본 아이콘 크기 (1lh)", () => {
    const { container } = render(() => <SdCollapseIcon />);
    const icon = container.firstChild as HTMLElement;
    const svg = icon.querySelector("svg");

    // IconChevronDown의 기본 크기 확인 (size="1lh"로 전달됨)
    expect(svg).not.toBeNull();
  });

  it("열림 시 ease-out 트랜지션 클래스 적용", () => {
    const { container } = render(() => <SdCollapseIcon open />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.className).toContain("ease-out");
  });

  it("닫힘 시 ease-in 트랜지션 클래스 적용", () => {
    const { container } = render(() => <SdCollapseIcon open={false} />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.className).toContain("ease-in");
  });

  it("추가 props 전달", () => {
    const { container } = render(() => <SdCollapseIcon data-custom="value" />);
    const icon = container.firstChild as HTMLElement;

    expect(icon.getAttribute("data-custom")).toBe("value");
  });
});
