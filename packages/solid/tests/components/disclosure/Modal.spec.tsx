import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../../../src/components/disclosure/Modal";

describe("Modal 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("open=true일 때 모달이 렌더링된다", async () => {
      render(() => (
        <Modal open={true} title="테스트 모달">
          <div data-testid="content">모달 내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("open=false일 때 모달이 DOM에 없다", () => {
      render(() => (
        <Modal open={false} title="테스트 모달">
          <div data-testid="content">모달 내용</div>
        </Modal>
      ));
      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("data-modal 속성이 설정된다", async () => {
      render(() => (
        <Modal open={true} title="테스트 모달">
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
      });
    });

    it("제목이 표시된다", async () => {
      render(() => (
        <Modal open={true} title="내 모달 제목">
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
        expect(modal!.textContent).toContain("내 모달 제목");
      });
    });
  });

  describe("헤더 옵션", () => {
    it("hideHeader=true일 때 헤더가 표시되지 않는다", async () => {
      render(() => (
        <Modal open={true} title="테스트" hideHeader>
          <div data-testid="content">내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
      const header = document.querySelector("[data-modal-header]");
      expect(header).toBeNull();
    });

    it("hideCloseButton=true일 때 닫기 버튼이 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트" hideCloseButton>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      const closeBtn = document.querySelector("[data-modal-close]");
      expect(closeBtn).toBeNull();
    });
  });

  describe("닫힘 동작", () => {
    it("닫기 버튼 클릭 시 onOpenChange(false)가 호출된다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("useCloseByBackdrop=true일 때 백드롭 클릭으로 닫힌다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Modal open={true} title="테스트" useCloseByBackdrop onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("useCloseByBackdrop=false일 때 백드롭 클릭으로 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("useCloseByEscapeKey=true일 때 Escape로 닫힌다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Modal open={true} title="테스트" useCloseByEscapeKey onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("canDeactivate가 false를 반환하면 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange} canDeactivate={() => false}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("float 모드", () => {
    it("float=true일 때 백드롭이 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트" float>
          <div data-testid="content">내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
      const backdrop = document.querySelector("[data-modal-backdrop]");
      expect(backdrop).toBeNull();
    });
  });

  describe("fill 모드", () => {
    it("fill=true일 때 다이얼로그에 fill 스타일이 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" fill>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("100%");
        expect(dialog.style.height).toBe("100%");
      });
    });
  });

  describe("크기 제어", () => {
    it("widthPx, heightPx가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" widthPx={400} heightPx={300}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("400px");
        expect(dialog.style.height).toBe("300px");
      });
    });

    it("minWidthPx, minHeightPx가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" minWidthPx={300} minHeightPx={200}>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.minWidth).toBe("300px");
        expect(dialog.style.minHeight).toBe("200px");
      });
    });
  });

  describe("리사이즈", () => {
    it("resizable=true일 때 리사이즈 바가 렌더링된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" resizable>
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const bars = document.querySelectorAll("[data-resize-bar]");
        expect(bars.length).toBe(8);
      });
    });

    it("resizable=false(기본)일 때 리사이즈 바가 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트">
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      const bars = document.querySelectorAll("[data-resize-bar]");
      expect(bars.length).toBe(0);
    });
  });

  describe("애니메이션", () => {
    it("열림 시 transition 클래스가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트">
          <div>내용</div>
        </Modal>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.classList.contains("transition-[opacity,transform]")).toBe(true);
        expect(dialog.classList.contains("duration-200")).toBe(true);
      });
    });
  });
});
