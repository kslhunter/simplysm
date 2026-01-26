import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SdSidebarContainer } from "../../src/components/SdSidebarContainer";
import { useSidebar } from "../../src/contexts/SidebarContext";

describe("SdSidebarContainer", () => {
  afterEach(() => {
    cleanup();
  });

  it("기본 렌더링", () => {
    const { container } = render(() => <SdSidebarContainer>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toBeDefined();
    expect(wrapper.textContent).toBe("내용");
  });

  it("기본 스타일 적용", () => {
    const { container } = render(() => <SdSidebarContainer>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.className).toContain("relative");
    expect(wrapper.className).toContain("h-full");
  });

  it("defaultCollapsed=false (기본값)", () => {
    const { container } = render(() => <SdSidebarContainer>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute("data-sd-collapsed")).toBe("false");
  });

  it("defaultCollapsed=true", () => {
    const { container } = render(() => <SdSidebarContainer defaultCollapsed>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute("data-sd-collapsed")).toBe("true");
  });

  it("@deprecated defaultToggle 하위 호환성", () => {
    const { container } = render(() => <SdSidebarContainer defaultToggle>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute("data-sd-collapsed")).toBe("true");
  });

  it("defaultCollapsed가 defaultToggle보다 우선", () => {
    const { container } = render(() => (
      <SdSidebarContainer defaultCollapsed={false} defaultToggle={true}>
        내용
      </SdSidebarContainer>
    ));
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute("data-sd-collapsed")).toBe("false");
  });

  it("커스텀 sidebarWidth 적용", () => {
    const { container } = render(() => <SdSidebarContainer sidebarWidth="300px">내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("300px");
  });

  it("기본 sidebarWidth (200px)", () => {
    const { container } = render(() => <SdSidebarContainer>내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("200px");
  });

  it("커스텀 class 병합", () => {
    const { container } = render(() => <SdSidebarContainer class="custom-class">내용</SdSidebarContainer>);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.className).toContain("custom-class");
    expect(wrapper.className).toContain("relative"); // 기본 스타일 유지
  });

  it("SidebarContext 제공 - 자식에서 useSidebar 사용 가능", () => {
    let contextValue: ReturnType<typeof useSidebar> | undefined;

    const ChildComponent = () => {
      contextValue = useSidebar();
      return <div>자식</div>;
    };

    render(() => (
      <SdSidebarContainer>
        <ChildComponent />
      </SdSidebarContainer>
    ));

    expect(contextValue).toBeDefined();
    expect(contextValue?.isCollapsed()).toBe(false);
  });

  it("toggleCollapsed 동작", () => {
    let contextValue: ReturnType<typeof useSidebar> | undefined;

    const ChildComponent = () => {
      contextValue = useSidebar();
      return <button onClick={contextValue.toggleCollapsed}>토글</button>;
    };

    const { getByText } = render(() => (
      <SdSidebarContainer>
        <ChildComponent />
      </SdSidebarContainer>
    ));

    expect(contextValue?.isCollapsed()).toBe(false);

    fireEvent.click(getByText("토글"));
    expect(contextValue?.isCollapsed()).toBe(true);

    fireEvent.click(getByText("토글"));
    expect(contextValue?.isCollapsed()).toBe(false);
  });

  it("setCollapsed 동작", () => {
    let contextValue: ReturnType<typeof useSidebar> | undefined;

    const ChildComponent = () => {
      contextValue = useSidebar();
      return (
        <>
          <button data-testid="open" onClick={() => contextValue?.setCollapsed(false)}>
            열기
          </button>
          <button data-testid="close" onClick={() => contextValue?.setCollapsed(true)}>
            닫기
          </button>
        </>
      );
    };

    const { getByTestId } = render(() => (
      <SdSidebarContainer>
        <ChildComponent />
      </SdSidebarContainer>
    ));

    expect(contextValue?.isCollapsed()).toBe(false);

    fireEvent.click(getByTestId("close"));
    expect(contextValue?.isCollapsed()).toBe(true);

    fireEvent.click(getByTestId("open"));
    expect(contextValue?.isCollapsed()).toBe(false);
  });

  it("추가 props 전달", () => {
    const { container } = render(() => (
      <SdSidebarContainer data-custom="value">
        내용
      </SdSidebarContainer>
    ));
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.getAttribute("data-custom")).toBe("value");
  });
});
