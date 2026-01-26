import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SidebarProvider, useSidebar } from "../../src/contexts/SidebarContext";

describe("SidebarContext", () => {
  afterEach(() => {
    cleanup();
  });

  describe("SidebarProvider", () => {
    it("기본 렌더링", () => {
      const { container } = render(() => (
        <SidebarProvider>
          <div>자식</div>
        </SidebarProvider>
      ));

      expect(container.textContent).toBe("자식");
    });

    it("defaultCollapsed=false (기본값)", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(false);
    });

    it("defaultCollapsed=true", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider defaultCollapsed>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(true);
    });

    it("@deprecated defaultToggle 하위 호환성", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider defaultToggle>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(true);
    });

    it("defaultCollapsed가 defaultToggle보다 우선", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider defaultCollapsed={false} defaultToggle={true}>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(false);
    });
  });

  describe("useSidebar", () => {
    it("Provider 외부에서 사용시 에러", () => {
      const TestComponent = () => {
        useSidebar();
        return null;
      };

      expect(() => render(() => <TestComponent />)).toThrow("useSidebar는 SidebarProvider 내부에서만 사용할 수 있습니다.");
    });

    it("isCollapsed 반환", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(typeof value?.isCollapsed).toBe("function");
      expect(value?.isCollapsed()).toBe(false);
    });

    it("setCollapsed 동작", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      const TestComponent = () => {
        value = useSidebar();
        return (
          <>
            <button data-testid="open" onClick={() => value?.setCollapsed(false)}>
              열기
            </button>
            <button data-testid="close" onClick={() => value?.setCollapsed(true)}>
              닫기
            </button>
          </>
        );
      };

      const { getByTestId } = render(() => (
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(false);

      fireEvent.click(getByTestId("close"));
      expect(value?.isCollapsed()).toBe(true);

      fireEvent.click(getByTestId("open"));
      expect(value?.isCollapsed()).toBe(false);
    });

    it("toggleCollapsed 동작", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      const TestComponent = () => {
        value = useSidebar();
        return <button onClick={value.toggleCollapsed}>토글</button>;
      };

      const { getByRole } = render(() => (
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      ));

      expect(value?.isCollapsed()).toBe(false);

      fireEvent.click(getByRole("button"));
      expect(value?.isCollapsed()).toBe(true);

      fireEvent.click(getByRole("button"));
      expect(value?.isCollapsed()).toBe(false);
    });

    it("isSidebarHovered 기본값 (false)", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      render(() => (
        <SidebarProvider>
          {(() => {
            value = useSidebar();
            return null;
          })()}
        </SidebarProvider>
      ));

      expect(value?.isSidebarHovered()).toBe(false);
    });

    it("setSidebarHovered 동작", () => {
      let value: ReturnType<typeof useSidebar> | undefined;

      const TestComponent = () => {
        value = useSidebar();
        return (
          <>
            <button data-testid="hover-on" onClick={() => value?.setSidebarHovered(true)}>
              Hover On
            </button>
            <button data-testid="hover-off" onClick={() => value?.setSidebarHovered(false)}>
              Hover Off
            </button>
          </>
        );
      };

      const { getByTestId } = render(() => (
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      ));

      expect(value?.isSidebarHovered()).toBe(false);

      fireEvent.click(getByTestId("hover-on"));
      expect(value?.isSidebarHovered()).toBe(true);

      fireEvent.click(getByTestId("hover-off"));
      expect(value?.isSidebarHovered()).toBe(false);
    });

    describe("하위 호환성 API", () => {
      it("toggle (deprecated) - isCollapsed와 동일", () => {
        let value: ReturnType<typeof useSidebar> | undefined;

        const TestComponent = () => {
          value = useSidebar();
          return <button onClick={value.toggleCollapsed}>토글</button>;
        };

        const { getByRole } = render(() => (
          <SidebarProvider>
            <TestComponent />
          </SidebarProvider>
        ));

        expect(value?.toggle()).toBe(value?.isCollapsed());

        fireEvent.click(getByRole("button"));
        expect(value?.toggle()).toBe(value?.isCollapsed());
      });

      it("setToggle (deprecated) - setCollapsed와 동일", () => {
        let value: ReturnType<typeof useSidebar> | undefined;

        const TestComponent = () => {
          value = useSidebar();
          return <button onClick={() => value?.setToggle(true)}>닫기</button>;
        };

        const { getByRole } = render(() => (
          <SidebarProvider>
            <TestComponent />
          </SidebarProvider>
        ));

        expect(value?.isCollapsed()).toBe(false);

        fireEvent.click(getByRole("button"));
        expect(value?.isCollapsed()).toBe(true);
      });

      it("toggleSidebar (deprecated) - toggleCollapsed와 동일", () => {
        let value: ReturnType<typeof useSidebar> | undefined;

        const TestComponent = () => {
          value = useSidebar();
          return <button onClick={value.toggleSidebar}>토글</button>;
        };

        const { getByRole } = render(() => (
          <SidebarProvider>
            <TestComponent />
          </SidebarProvider>
        ));

        expect(value?.isCollapsed()).toBe(false);

        fireEvent.click(getByRole("button"));
        expect(value?.isCollapsed()).toBe(true);
      });
    });
  });
});
