import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { SdSidebar } from "../../src/components/SdSidebar";
import { SidebarProvider } from "../../src/contexts/SidebarContext";

describe("SdSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  const renderWithProvider = (defaultCollapsed = false) => {
    return render(() => (
      <SidebarProvider defaultCollapsed={defaultCollapsed}>
        <SdSidebar>사이드바 내용</SdSidebar>
      </SidebarProvider>
    ));
  };

  it("기본 렌더링 (Provider 필요)", () => {
    const { container } = renderWithProvider();
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar).not.toBeNull();
    expect(sidebar.textContent).toBe("사이드바 내용");
  });

  it("기본 스타일 적용", () => {
    const { container } = renderWithProvider();
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.className).toContain("absolute");
    expect(sidebar.className).toContain("top-0");
    expect(sidebar.className).toContain("left-0");
    expect(sidebar.className).toContain("h-full");
    expect(sidebar.className).toContain("bg-bg-elevated");
    expect(sidebar.className).toContain("border-r");
  });

  it("collapsed=false (기본값) - 표시 상태", () => {
    const { container } = renderWithProvider(false);
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.getAttribute("data-sd-collapsed")).toBe("false");
  });

  it("collapsed=true - 숨김 상태", () => {
    const { container } = renderWithProvider(true);
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.getAttribute("data-sd-collapsed")).toBe("true");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => (
      <SidebarProvider>
        <SdSidebar class="custom-class">사이드바</SdSidebar>
      </SidebarProvider>
    ));
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.className).toContain("custom-class");
    expect(sidebar.className).toContain("absolute"); // 기본 스타일 유지
  });

  it("z-index 스타일 적용", () => {
    const { container } = renderWithProvider();
    const sidebar = container.querySelector("[data-sd-collapsed]") as HTMLElement;

    expect(sidebar.style.zIndex).toBe("var(--z-index-sidebar)");
  });

  it("sidebar 너비 CSS 변수 사용", () => {
    const { container } = renderWithProvider();
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.className).toContain("w-(--sidebar-width)");
  });

  it("Provider 없이 사용 시 에러", () => {
    expect(() => render(() => <SdSidebar>사이드바</SdSidebar>)).toThrow();
  });

  it("추가 props 전달", () => {
    const { container } = render(() => (
      <SidebarProvider>
        <SdSidebar data-custom="value">
          사이드바
        </SdSidebar>
      </SidebarProvider>
    ));
    const sidebar = container.querySelector("[data-sd-collapsed]")!;

    expect(sidebar.getAttribute("data-custom")).toBe("value");
  });
});
