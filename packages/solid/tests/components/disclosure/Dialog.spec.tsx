import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Dialog } from "../../../src/components/disclosure/Dialog";

describe("Dialog 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("open=true일 때 다이얼로그가 렌더링된다", async () => {
      render(() => (
        <Dialog open={true} title="테스트 다이얼로그">
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("open=false일 때 다이얼로그가 DOM에 없다", () => {
      render(() => (
        <Dialog open={false} title="테스트 다이얼로그">
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
      ));
      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("data-modal 속성이 설정된다", async () => {
      render(() => (
        <Dialog open={true} title="테스트 다이얼로그">
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
      });
    });

    it("제목이 표시된다", async () => {
      render(() => (
        <Dialog open={true} title="내 다이얼로그 제목">
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
        expect(modal!.textContent).toContain("내 다이얼로그 제목");
      });
    });
  });

  describe("헤더 옵션", () => {
    it("hideHeader=true일 때 헤더가 표시되지 않는다", async () => {
      render(() => (
        <Dialog open={true} title="테스트" hideHeader>
          <div data-testid="content">내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
      const header = document.querySelector("[data-modal-header]");
      expect(header).toBeNull();
    });

    it("closable={false}일 때 닫기 버튼이 없다", async () => {
      render(() => (
        <Dialog open={true} title="테스트" closable={false}>
          <div>내용</div>
        </Dialog>
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
        <Dialog open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closeOnBackdrop=true일 때 백드롭 클릭으로 닫힌다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog open={true} title="테스트" closeOnBackdrop onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closeOnBackdrop 미설정 시 백드롭 클릭으로 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("기본적으로 Escape 키로 닫힌다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closeOnEscape=true일 때 Escape로 닫힌다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog open={true} title="테스트" closeOnEscape onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closeOnEscape=false일 때 Escape로 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog open={true} title="테스트" closeOnEscape={false} onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("canDeactivate가 false를 반환하면 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <Dialog
          open={true}
          title="테스트"
          onOpenChange={handleOpenChange}
          canDeactivate={() => false}
        >
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("접근성", () => {
    it("role=dialog와 aria-modal 속성이 설정된다", async () => {
      render(() => (
        <Dialog open={true} title="접근성 테스트">
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.getAttribute("aria-modal")).toBe("true");
        expect(dialog.getAttribute("aria-label")).toBe("접근성 테스트");
      });
    });

    it("float 모드에서는 aria-modal이 설정되지 않는다", async () => {
      render(() => (
        <Dialog open={true} title="플로팅 다이얼로그" float>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.hasAttribute("aria-modal")).toBe(false);
        expect(dialog.getAttribute("aria-label")).toBe("플로팅 다이얼로그");
      });
    });
  });

  describe("float 모드", () => {
    it("float=true일 때 백드롭이 없다", async () => {
      render(() => (
        <Dialog open={true} title="테스트" float>
          <div data-testid="content">내용</div>
        </Dialog>
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
        <Dialog open={true} title="테스트" fill>
          <div>내용</div>
        </Dialog>
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
    it("width, height가 적용된다", async () => {
      render(() => (
        <Dialog open={true} title="테스트" width={400} height={300}>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("400px");
        expect(dialog.style.height).toBe("300px");
      });
    });

    it("minWidth, minHeight가 적용된다", async () => {
      render(() => (
        <Dialog open={true} title="테스트" minWidth={300} minHeight={200}>
          <div>내용</div>
        </Dialog>
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
        <Dialog open={true} title="테스트" resizable>
          <div>내용</div>
        </Dialog>
      ));
      await waitFor(() => {
        const bars = document.querySelectorAll("[data-resize-bar]");
        expect(bars.length).toBe(8);
      });
    });

    it("resizable=false(기본)일 때 리사이즈 바가 없다", async () => {
      render(() => (
        <Dialog open={true} title="테스트">
          <div>내용</div>
        </Dialog>
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
        <Dialog open={true} title="테스트">
          <div>내용</div>
        </Dialog>
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
