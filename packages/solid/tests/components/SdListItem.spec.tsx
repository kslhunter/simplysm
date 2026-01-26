import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SdListItem } from "../../src/components/SdListItem";
import { SdList } from "../../src/components/SdList";

describe("SdListItem", () => {
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
    const { container } = render(() => <SdListItem>아이템</SdListItem>);
    const item = container.firstChild as HTMLElement;

    expect(item).toBeDefined();
    expect(item.textContent).toBe("아이템");
  });

  it("data 속성 기본값 확인", () => {
    const { container } = render(() => <SdListItem>아이템</SdListItem>);
    const item = container.firstChild as HTMLElement;

    expect(item.getAttribute("data-sd-layout")).toBe("accordion");
    expect(item.getAttribute("data-sd-open")).toBe("false");
    expect(item.getAttribute("data-sd-selected")).toBe("false");
    expect(item.getAttribute("data-sd-readonly")).toBe("false");
    expect(item.getAttribute("data-sd-has-children")).toBe("false");
  });

  it("클릭 이벤트 핸들링", () => {
    const handleClick = vi.fn();
    const { container } = render(() => <SdListItem onClick={handleClick}>아이템</SdListItem>);
    const content = container.querySelector("[role='button']")!;

    fireEvent.click(content);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("selected 상태 적용", () => {
    const { container } = render(() => <SdListItem selected>아이템</SdListItem>);
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    expect(item.getAttribute("data-sd-selected")).toBe("true");
    expect(content.className).toContain("bg-bg-hover");
    expect(content.className).toContain("font-semibold");
  });

  it("readonly 상태 적용", () => {
    const handleClick = vi.fn();
    const { container } = render(() => (
      <SdListItem readonly onClick={handleClick}>
        아이템
      </SdListItem>
    ));
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    expect(item.getAttribute("data-sd-readonly")).toBe("true");
    expect(content.className).toContain("cursor-default");

    // readonly 상태에서도 onClick은 호출됨
    fireEvent.click(content);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("accordion 레이아웃 - 자식 있음 - 클릭시 토글", () => {
    const { container } = render(() => (
      <SdListItem layout="accordion" childList={<SdList inset>자식</SdList>}>
        부모
      </SdListItem>
    ));
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    expect(item.getAttribute("data-sd-has-children")).toBe("true");
    expect(item.getAttribute("data-sd-open")).toBe("false");

    fireEvent.click(content);
    expect(item.getAttribute("data-sd-open")).toBe("true");

    fireEvent.click(content);
    expect(item.getAttribute("data-sd-open")).toBe("false");
  });

  it("flat 레이아웃 - 자식 항상 펼침", () => {
    const { container } = render(() => (
      <SdListItem layout="flat" childList={<SdList inset>자식</SdList>}>
        부모
      </SdListItem>
    ));
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    expect(item.getAttribute("data-sd-layout")).toBe("flat");
    expect(content.className).toContain("bg-transparent");
    expect(content.className).toContain("text-sm");
  });

  it("controlled open 상태", () => {
    const [open, setOpen] = createSignal(false);
    const handleOpenChange = vi.fn((v: boolean) => setOpen(v));

    const { container } = render(() => (
      <SdListItem
        layout="accordion"
        open={open()}
        onOpenChange={handleOpenChange}
        childList={<SdList inset>자식</SdList>}
      >
        부모
      </SdListItem>
    ));
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    expect(item.getAttribute("data-sd-open")).toBe("false");

    fireEvent.click(content);
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(item.getAttribute("data-sd-open")).toBe("true");
  });

  it("uncontrolled defaultOpen - 초기 열림 상태", () => {
    const { container } = render(() => (
      <SdListItem layout="accordion" defaultOpen childList={<SdList inset>자식</SdList>}>
        부모
      </SdListItem>
    ));
    const item = container.firstChild as HTMLElement;
    const content = container.querySelector("[role='button']")!;

    // defaultOpen=true로 초기 열림 상태
    expect(item.getAttribute("data-sd-open")).toBe("true");

    // 클릭하면 닫힘
    fireEvent.click(content);
    expect(item.getAttribute("data-sd-open")).toBe("false");
  });

  it("tool 슬롯 렌더링", () => {
    const { container } = render(() => <SdListItem tool={<span data-testid="tool">도구</span>}>아이템</SdListItem>);
    const tool = container.querySelector("[data-testid='tool']");

    expect(tool).not.toBeNull();
    expect(tool?.textContent).toBe("도구");
  });

  it("selectedIcon 렌더링 - 선택됨", () => {
    const Icon = () => <span data-testid="icon">아이콘</span>;
    const { container } = render(() => (
      <SdListItem selected selectedIcon={Icon}>
        아이템
      </SdListItem>
    ));
    const iconWrapper = container.querySelector("[data-testid='icon']")?.parentElement;

    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper?.className).toContain("text-primary");
  });

  it("selectedIcon 렌더링 - 선택 안됨", () => {
    const Icon = () => <span data-testid="icon">아이콘</span>;
    const { container } = render(() => <SdListItem selectedIcon={Icon}>아이템</SdListItem>);
    const iconWrapper = container.querySelector("[data-testid='icon']")?.parentElement;

    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper?.className).toContain("text-text-muted/10");
  });

  it("키보드 접근성 - Enter 키", () => {
    const handleClick = vi.fn();
    const { container } = render(() => <SdListItem onClick={handleClick}>아이템</SdListItem>);
    const content = container.querySelector("[role='button']")!;

    fireEvent.keyDown(content, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("키보드 접근성 - Space 키", () => {
    const handleClick = vi.fn();
    const { container } = render(() => <SdListItem onClick={handleClick}>아이템</SdListItem>);
    const content = container.querySelector("[role='button']")!;

    fireEvent.keyDown(content, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("키보드 접근성 - readonly에서 비활성", () => {
    const handleClick = vi.fn();
    const { container } = render(() => (
      <SdListItem readonly onClick={handleClick}>
        아이템
      </SdListItem>
    ));
    const content = container.querySelector("[role='button']")!;

    fireEvent.keyDown(content, { key: "Enter" });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("contentClass 적용", () => {
    const { container } = render(() => <SdListItem contentClass="custom-content">아이템</SdListItem>);
    const content = container.querySelector("[role='button']")!;

    expect(content.className).toContain("custom-content");
  });

  it("contentStyle 적용", () => {
    const { container } = render(() => <SdListItem contentStyle={{ color: "red" }}>아이템</SdListItem>);
    const content = container.querySelector("[role='button']") as HTMLElement;

    expect(content.style.color).toBe("red");
  });

  it("aria-expanded 속성 - 자식 있을 때만 표시", () => {
    const { container: c1 } = render(() => <SdListItem>아이템</SdListItem>);
    const content1 = c1.querySelector("[role='button']")!;
    expect(content1.getAttribute("aria-expanded")).toBeNull();

    const { container: c2 } = render(() => (
      <SdListItem childList={<SdList inset>자식</SdList>}>부모</SdListItem>
    ));
    const content2 = c2.querySelector("[role='button']")!;
    expect(content2.getAttribute("aria-expanded")).toBe("false");
  });
});
