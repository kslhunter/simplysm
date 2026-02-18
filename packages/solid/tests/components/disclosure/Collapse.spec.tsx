import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Collapse } from "../../../src";

describe("Collapse", () => {
  // requestAnimationFrame mock
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("렌더링", () => {
    it("open={false}일 때 콘텐츠가 visibility:hidden", () => {
      const { container } = render(() => <Collapse open={false}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");
    });

    it("open={true}일 때 콘텐츠가 visible", () => {
      const { container } = render(() => <Collapse open={true}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).not.toBe("hidden");
    });

    it("open이 undefined일 때 false로 처리 (visibility:hidden)", () => {
      const { container } = render(() => <Collapse>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");
    });

    it("콘텐츠가 비어있어도 정상 렌더링", () => {
      const { container } = render(() => <Collapse open={false} />);
      expect(container.firstChild).toBeTruthy();
    });

    it("추가 class가 병합됨", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Collapse open={true} class="my-test-class">
          Content
        </Collapse>
      ));
      expect(container.querySelector(".my-test-class")).toBeTruthy();
      // overflow: hidden은 inline style로 적용됨
      const rootDiv = container.querySelector("[data-collapse]") as HTMLElement;
      expect(rootDiv.style.overflow).toBe("hidden");
    });
  });

  describe("margin-top 계산", () => {
    it("open={false}일 때 margin-top이 콘텐츠 높이의 음수값", async () => {
      const { container } = render(() => (
        <Collapse open={false}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));
      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv).toBeTruthy();

      // ResizeObserver가 측정을 완료할 때까지 대기
      await waitFor(() => {
        const marginTop = contentDiv.style.marginTop;
        // margin-top이 음수값인지 확인 (실제 높이 측정됨)
        expect(marginTop).toMatch(/^-\d+px$/);
        expect(parseInt(marginTop)).toBeLessThan(0);
      });
    });

    it("open={true}일 때 margin-top이 없음", () => {
      const { container } = render(() => (
        <Collapse open={true}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));
      const contentDiv = container.querySelector("[data-collapse]")?.firstElementChild;
      const marginTop = (contentDiv as HTMLElement).style.marginTop;
      expect(!marginTop || marginTop === "").toBeTruthy();
    });
  });

  describe("초기 렌더링 및 transition", () => {
    it("마운트 후 transition 클래스가 적용됨", () => {
      const { container } = render(() => <Collapse open={false}>Content</Collapse>);
      const contentDiv = container.querySelector("[data-collapse]")?.firstElementChild;
      expect(contentDiv?.classList.contains("transition-[margin-top]")).toBeTruthy();
    });

    it("open 상태 변경 시 transition class 유지되며 margin-top 변경", async () => {
      const [open, setOpen] = createSignal(false);
      const { container } = render(() => (
        <Collapse open={open()}>
          <div style={{ height: "100px" }}>Content</div>
        </Collapse>
      ));

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;

      // 초기 상태: 닫힘, margin-top 음수
      await waitFor(() => {
        expect(parseInt(contentDiv.style.marginTop)).toBeLessThan(0);
      });
      expect(contentDiv.classList.contains("transition-[margin-top]")).toBeTruthy();
      expect(contentDiv.classList.contains("duration-200")).toBeTruthy();

      // 열림 상태로 변경
      setOpen(true);

      // transition class 유지, margin-top 변경
      await waitFor(() => {
        const marginTop = contentDiv.style.marginTop;
        expect(!marginTop || marginTop === "").toBeTruthy();
      });
      expect(contentDiv.classList.contains("transition-[margin-top]")).toBeTruthy();
    });
  });

  describe("동적 상태 변경", () => {
    it("open 상태 변경 시 visibility 업데이트", () => {
      const [open, setOpen] = createSignal(false);
      const { container } = render(() => <Collapse open={open()}>Content</Collapse>);

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;
      expect(contentDiv.style.visibility).toBe("hidden");

      setOpen(true);
      expect(contentDiv.style.visibility).not.toBe("hidden");
    });

    it("콘텐츠 높이 변경 시 margin-top 재계산", async () => {
      const [showExtra, setShowExtra] = createSignal(false);
      const { container } = render(() => (
        <Collapse open={false}>
          <div style={{ height: "50px" }}>Base Content</div>
          {showExtra() && <div style={{ height: "50px" }}>Extra Content</div>}
        </Collapse>
      ));

      const contentDiv = container.querySelector("[data-collapse]")
        ?.firstElementChild as HTMLElement;

      // 초기 높이 측정 대기
      await waitFor(() => {
        const initialMarginTop = parseInt(contentDiv.style.marginTop);
        expect(initialMarginTop).toBeLessThan(0);
      });

      const initialMarginTop = parseInt(contentDiv.style.marginTop);

      // 콘텐츠 추가로 높이 변경
      setShowExtra(true);

      // ResizeObserver가 새 높이를 감지하고 margin-top 재계산 대기
      await waitFor(() => {
        const newMarginTop = parseInt(contentDiv.style.marginTop);
        // 새 margin-top이 초기값보다 더 작아야 함 (더 큰 음수)
        expect(newMarginTop).toBeLessThan(initialMarginTop);
      });
    });
  });
});
