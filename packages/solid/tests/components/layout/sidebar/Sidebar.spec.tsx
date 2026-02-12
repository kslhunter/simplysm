import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Component, Setter } from "solid-js";

// 미디어 쿼리 mock
const mockCreateMediaQuery = vi.fn(() => () => true as boolean);
vi.mock("@solid-primitives/media", () => ({
  createMediaQuery: () => mockCreateMediaQuery(),
}));

// @solidjs/router mock
vi.mock("@solidjs/router", () => ({
  useBeforeLeave: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: "/" })),
  useNavigate: vi.fn(() => vi.fn()),
}));

import { Sidebar, useSidebarContext } from "../../../../src";

// ToggleCapture helper - Context에서 setToggle을 추출하여 외부에서 제어
const ToggleCapture: Component<{ onCapture: (setToggle: Setter<boolean>) => void }> = (props) => {
  const { setToggle } = useSidebarContext();
  props.onCapture(setToggle);
  return null;
};

describe("Sidebar 컴포넌트", () => {
  beforeEach(() => {
    mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑 모드
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("기본 렌더링", () => {
    it("children이 사이드바 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <Sidebar.Container>
          <Sidebar>
            <span>사이드바 콘텐츠</span>
          </Sidebar>
        </Sidebar.Container>
      ));

      expect(getByText("사이드바 콘텐츠")).toBeTruthy();
    });

    it("aside 요소로 렌더링된다", () => {
      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      expect(container.querySelector("aside")).toBeTruthy();
    });
  });

  describe("열림/닫힘 상태", () => {
    it("데스크탑에서 toggle=false일 때 열림 상태 (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      // toggle=false (초기값) → 데스크탑에서 열림
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });

    it("데스크탑에서 toggle=true일 때 닫힘 상태 (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      setToggle(true); // 닫힘으로 전환
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("모바일에서 toggle=false일 때 닫힘 상태 (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      // toggle=false (초기값) → 모바일에서 닫힘
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("모바일에서 toggle=true일 때 열림 상태 (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      let setToggle!: Setter<boolean>;

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture onCapture={(fn) => (setToggle = fn)} />
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      setToggle(true); // 열림으로 전환
      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });
  });

  describe("aria 속성", () => {
    it("열림 상태일 때 aria-hidden=false", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      // toggle=false (초기값) → 데스크탑에서 열림
      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("false");
    });

    it("닫힘 상태일 때 aria-hidden=true", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      // toggle=false (초기값) → 모바일에서 닫힘
      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
    });

    it("닫힘 상태일 때 inert 속성이 설정된다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      // toggle=false (초기값) → 모바일에서 닫힘
      const sidebar = container.querySelector("aside");
      expect(sidebar?.hasAttribute("inert")).toBe(true);
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const { container } = render(() => (
        <Sidebar.Container>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <Sidebar class="my-custom-class">Content</Sidebar>
        </Sidebar.Container>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("Context 사용", () => {
    it("SidebarContainer 외부에서 useSidebarContext 사용 시 에러 발생", () => {
      const TestComponent = () => {
        useSidebarContext();
        return <div>Test</div>;
      };

      expect(() => render(() => <TestComponent />)).toThrow(
        "useSidebarContext는 SidebarContainer 내부에서만 사용할 수 있습니다",
      );
    });
  });
});
