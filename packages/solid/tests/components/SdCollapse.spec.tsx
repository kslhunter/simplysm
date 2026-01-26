import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdCollapse } from "../../src/components/SdCollapse";

describe("SdCollapse", () => {
  beforeEach(() => {
    // ResizeObserver mock
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );

    // MutationObserver mock
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("기본 렌더링", () => {
    const { container } = render(() => <SdCollapse>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse).toBeDefined();
    expect(collapse.textContent).toBe("콘텐츠");
  });

  it("기본 스타일 적용", () => {
    const { container } = render(() => <SdCollapse>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.className).toContain("block");
    expect(collapse.className).toContain("overflow-hidden");
  });

  it("open=false (기본값) - 닫힘 상태", () => {
    const { container } = render(() => <SdCollapse>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.getAttribute("data-sd-open")).toBe("false");
  });

  it("open=true - 열림 상태", () => {
    const { container } = render(() => <SdCollapse open>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.getAttribute("data-sd-open")).toBe("true");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => <SdCollapse class="custom-class">콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.className).toContain("custom-class");
    expect(collapse.className).toContain("block");
  });

  it("동적 open 상태 변경", () => {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => <SdCollapse open={open()}>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.getAttribute("data-sd-open")).toBe("false");

    setOpen(true);
    expect(collapse.getAttribute("data-sd-open")).toBe("true");

    setOpen(false);
    expect(collapse.getAttribute("data-sd-open")).toBe("false");
  });

  it("추가 props 전달", () => {
    const { container } = render(() => (
      <SdCollapse data-custom="value">
        콘텐츠
      </SdCollapse>
    ));
    const collapse = container.firstChild as HTMLElement;

    expect(collapse.getAttribute("data-custom")).toBe("value");
  });

  it("열림 시 ease-out 트랜지션 클래스 적용", () => {
    const { container } = render(() => <SdCollapse open>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;
    const inner = collapse.firstChild as HTMLElement;

    expect(inner.className).toContain("ease-out");
  });

  it("닫힘 시 ease-in 트랜지션 클래스 적용", () => {
    const { container } = render(() => <SdCollapse open={false}>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;
    const inner = collapse.firstChild as HTMLElement;

    expect(inner.className).toContain("ease-in");
  });

  it("open=false일 때 margin-top이 -contentHeight로 설정됨", () => {
    // scrollHeight를 mock하기 위한 설정
    let resizeCallback: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );

    const { container } = render(() => <SdCollapse open={false}>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;
    const inner = collapse.firstChild as HTMLElement;

    // scrollHeight mock (100px)
    Object.defineProperty(inner, "scrollHeight", { value: 100, configurable: true });

    // ResizeObserver 콜백 실행
    resizeCallback?.();

    expect(inner.style.marginTop).toBe("-100px");
  });

  it("open=true일 때 margin-top이 빈 문자열로 설정됨", () => {
    let resizeCallback: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );

    const { container } = render(() => <SdCollapse open={true}>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;
    const inner = collapse.firstChild as HTMLElement;

    Object.defineProperty(inner, "scrollHeight", { value: 100, configurable: true });
    resizeCallback?.();

    expect(inner.style.marginTop).toBe("");
  });

  it("동적 open 변경 시 margin-top이 업데이트됨", () => {
    let resizeCallback: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resizeCallback = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );

    const [open, setOpen] = createSignal(false);
    const { container } = render(() => <SdCollapse open={open()}>콘텐츠</SdCollapse>);
    const collapse = container.firstChild as HTMLElement;
    const inner = collapse.firstChild as HTMLElement;

    Object.defineProperty(inner, "scrollHeight", { value: 50, configurable: true });
    resizeCallback?.();

    expect(inner.style.marginTop).toBe("-50px");

    setOpen(true);
    expect(inner.style.marginTop).toBe("");

    setOpen(false);
    expect(inner.style.marginTop).toBe("-50px");
  });
});
