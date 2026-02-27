import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Dialog } from "../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../src/providers/ConfigContext";

describe("Dialog", () => {
  describe("basic rendering", () => {
    it("renders when open=true", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("is absent from DOM when open=false", () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={false}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div data-testid="content">다이얼로그 내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("sets data-modal attribute", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 다이얼로그</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
      });
    });

    it("renders Dialog.Header slot in header", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트 제목</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));

      await waitFor(() => {
        const header = document.querySelector("[data-modal-header]");
        expect(header?.textContent).toContain("테스트 제목");
      });
    });
  });

  describe("header options", () => {
    it("does not render header when Dialog.Header is absent", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <div data-testid="content">내용만</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));

      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
      const header = document.querySelector("[data-modal-header]");
      expect(header).toBeNull();
    });

    it("renders Dialog.Action slot beside the close button", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>제목</Dialog.Header>
          <Dialog.Action>
            <button data-testid="action">액션</button>
          </Dialog.Action>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));

      await waitFor(() => {
        expect(document.querySelector('[data-testid="action"]')).not.toBeNull();
      });
    });

    it("hides close button when closable={false}", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} closable={false}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      const closeBtn = document.querySelector("[data-modal-close]");
      expect(closeBtn).toBeNull();
    });
  });

  describe("close behavior", () => {
    it("calls onOpenChange(false) when close button is clicked", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes on backdrop click when closeOnBackdrop=true", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} closeOnBackdrop onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not close on backdrop click when closeOnBackdrop is not set", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("closes on Escape key by default", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes on Escape when closeOnEscape=true", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} closeOnEscape onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not close on Escape when closeOnEscape=false", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} closeOnEscape={false} onOpenChange={handleOpenChange}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("does not close when canDeactivate returns false", async () => {
      const handleOpenChange = vi.fn();
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} onOpenChange={handleOpenChange} canDeactivate={() => false}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });
      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("sets role=dialog and aria-modal attributes", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>접근성 테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.getAttribute("aria-modal")).toBe("true");
      });
    });

    it("aria-labelledby references the Dialog.Header element", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>접근성 제목</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        const headerId = dialog.getAttribute("aria-labelledby");
        expect(headerId).toBeTruthy();
        const header = document.getElementById(headerId!);
        expect(header?.textContent).toContain("접근성 제목");
      });
    });

    it("omits aria-labelledby when Dialog.Header is absent", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <div>내용만</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.hasAttribute("aria-labelledby")).toBe(false);
      });
    });

    it("does not set aria-modal in float mode", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} float>
          <Dialog.Header>플로팅 다이얼로그</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute("role")).toBe("dialog");
        expect(dialog.hasAttribute("aria-modal")).toBe(false);
      });
    });
  });

  describe("float mode", () => {
    it("has no backdrop when float=true", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} float>
          <Dialog.Header>테스트</Dialog.Header>
          <div data-testid="content">내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
      const backdrop = document.querySelector("[data-modal-backdrop]");
      expect(backdrop).toBeNull();
    });
  });

  describe("fill mode", () => {
    it("applies fill style to dialog when fill=true", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} fill>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("100%");
        expect(dialog.style.height).toBe("100%");
      });
    });
  });

  describe("size control", () => {
    it("applies width and height", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} width={400} height={300}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("400px");
        expect(dialog.style.height).toBe("300px");
      });
    });

    it("applies minWidth and minHeight", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} minWidth={300} minHeight={200}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.minWidth).toBe("300px");
        expect(dialog.style.minHeight).toBe("200px");
      });
    });
  });

  describe("resize", () => {
    it("renders resize bars when resizable=true", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true} resizable>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        const bars = document.querySelectorAll("[data-resize-bar]");
        expect(bars.length).toBe(8);
      });
    });

    it("has no resize bars when resizable=false (default)", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
      ));
      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });
      const bars = document.querySelectorAll("[data-resize-bar]");
      expect(bars.length).toBe(0);
    });
  });

  describe("animation", () => {
    it("applies transition classes on open", async () => {
      render(() => (
        <ConfigProvider clientName="test"><I18nProvider>
          <Dialog open={true}>
          <Dialog.Header>테스트</Dialog.Header>
          <div>내용</div>
        </Dialog>
        </I18nProvider></ConfigProvider>
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
