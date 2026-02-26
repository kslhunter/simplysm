import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Dialog } from "../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../../src/providers/i18n/I18nContext";

describe("Dialog 컴포넌트", () => {
  describe("basic rendering", () => {
    it("open=true일 때 다이얼로그가 렌더링된다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("open=false일 때 다이얼로그가 DOM에 없다", () => {
      render(() => (
        <I18nProvider>
          <Dialog open={false}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
        </I18nProvider>
      ));
      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("data-modal 속성이 설정된다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
      });
    });

    it("Dialog.Header 슬롯이 헤더에 렌더링된다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 제목</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));

      await waitFor(() => {
        const header = document.querySelector("[data-modal-header]");
        expect(header?.textContent).toContain("테스트 제목");
      });
    });
  });

  describe("헤더 옵션", () => {
    it("Dialog.Header 미제공 시 헤더가 렌더링되지 않는다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <div data-testid="content">내용만</div>
        </Dialog>
        </I18nProvider>
      ));

      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
      const header = document.querySelector("[data-modal-header]");
      expect(header).toBeNull();
    });

    it("Dialog.Action 슬롯이 닫기 버튼 옆에 렌더링된다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>제목</Dialog.Header>
          <Dialog.Action>
            <button data-testid="action">액션</button>
          </Dialog.Action>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));

      await waitFor(() => {
        expect(document.querySelector('[data-testid="action"]')).not.toBeNull();
      });
    });

    it("closable={false}일 때 닫기 버튼이 없다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true} closable={false}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} closeOnBackdrop onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} closeOnEscape onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} closeOnEscape={false} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange} canDeactivate={() => false}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("role=dialog와 aria-modal 속성이 설정된다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>접근성 테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.getAttribute("aria-modal")).toBe("true");
      });
    });

    it("aria-labelledby가 Dialog.Header 요소를 참조한다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>접근성 제목</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        const headerId = dialog.getAttribute("aria-labelledby");
        expect(headerId).toBeTruthy();
        const header = document.getElementById(headerId!);
        expect(header?.textContent).toContain("접근성 제목");
      });
    });

    it("Dialog.Header 미제공 시 aria-labelledby가 없다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <div>내용만</div>
        </Dialog>
        </I18nProvider>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.hasAttribute("aria-labelledby")).toBe(false);
      });
    });

    it("float 모드에서는 aria-modal이 설정되지 않는다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true} float>
          <Dialog.Header>플로팅 다이얼로그</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.hasAttribute("aria-modal")).toBe(false);
      });
    });
  });

  describe("float 모드", () => {
    it("float=true일 때 백드롭이 없다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true} float>
          <Dialog.Header>테스트</Dialog.Header>
          <div data-testid="content">내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} fill>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} width={400} height={300}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} minWidth={300} minHeight={200}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true} resizable>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
      ));
      await waitFor(() => {
        const bars = document.querySelectorAll("[data-resize-bar]");
        expect(bars.length).toBe(8);
      });
    });

    it("resizable=false(기본)일 때 리사이즈 바가 없다", async () => {
      render(() => (
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
        <I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider>
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
