import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";

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

// usePersisted mock - 테스트에서 상태를 제어할 수 있도록
let mockToggle: ReturnType<typeof createSignal<boolean>>;
vi.mock("../../../src/contexts/usePersisted", () => ({
  usePersisted: () => {
    return mockToggle;
  },
}));

import { Sidebar } from "../../../src";

describe("SidebarContainer 컴포넌트", () => {
  beforeEach(() => {
    mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑 모드
    mockToggle = createSignal(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("기본 렌더링", () => {
    it("children이 컨테이너 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <Sidebar.Container>
          <span>콘텐츠</span>
        </Sidebar.Container>
      ));

      expect(getByText("콘텐츠")).toBeTruthy();
    });
  });

  describe("padding-left 처리", () => {
    it("데스크탑에서 열림 상태일 때 padding-left 적용", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑
      mockToggle = createSignal(false); // toggle=false → 데스크탑에서 열림

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("16rem");
    });

    it("데스크탑에서 닫힘 상태일 때 padding-left 없음", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑
      mockToggle = createSignal(true); // toggle=true → 데스크탑에서 닫힘

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });

    it("모바일에서는 padding-left 없음", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      mockToggle = createSignal(false);

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });
  });

  describe("backdrop 렌더링", () => {
    it("모바일에서 열림 상태일 때 backdrop이 렌더링된다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      mockToggle = createSignal(true); // toggle=true → 모바일에서 열림

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeTruthy();
    });

    it("모바일에서 닫힘 상태일 때 backdrop이 렌더링되지 않는다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      mockToggle = createSignal(false); // toggle=false → 모바일에서 닫힘

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeFalsy();
    });

    it("데스크탑에서는 backdrop이 렌더링되지 않는다", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑
      mockToggle = createSignal(false); // 열림 상태

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeFalsy();
    });
  });

  describe("backdrop 클릭 이벤트", () => {
    it("backdrop 클릭 시 사이드바가 닫힌다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      mockToggle = createSignal(true); // 열림 상태

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector(
        '[role="button"][aria-label="사이드바 닫기"]',
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.click(backdrop);

      // toggle이 false로 변경되었는지 확인
      expect(mockToggle[0]()).toBe(false);
    });

    it("backdrop에서 Escape 키 누르면 사이드바가 닫힌다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일
      mockToggle = createSignal(true); // 열림 상태

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector(
        '[role="button"][aria-label="사이드바 닫기"]',
      ) as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.keyDown(backdrop, { key: "Escape" });

      expect(mockToggle[0]()).toBe(false);
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Sidebar.Container class="my-custom-class">
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.classList.contains("my-custom-class")).toBe(true);
    });

    it("사용자 정의 style이 병합된다", () => {
      const { container } = render(() => (
        <Sidebar.Container style={{ "background-color": "red" }}>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.backgroundColor).toBe("red");
    });
  });
});
