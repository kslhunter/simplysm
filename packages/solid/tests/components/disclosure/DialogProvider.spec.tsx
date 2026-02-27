import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { useDialogInstance } from "../../../src/components/disclosure/DialogInstanceContext";

// dialog content component for testing
function TestContent() {
  const dialog = useDialogInstance<string>();
  return (
    <div>
      <span data-testid="modal-content">다이얼로그 내용</span>
      <button data-testid="close-btn" onClick={() => dialog?.close("result")}>
        닫기
      </button>
      <button data-testid="close-no-result" onClick={() => dialog?.close()}>
        취소
      </button>
    </div>
  );
}

// test component that calls useDialog
function TestApp() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show<string>(() => <TestContent />, { header: "테스트 다이얼로그" });
      }}
    >
      다이얼로그 열기
    </button>
  );
}

// test component that opens without a header
function TestAppNoHeader() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show<string>(() => <TestContent />, {});
      }}
    >
      다이얼로그 열기
    </button>
  );
}

describe("DialogProvider", () => {
  it("displays dialog via show()", async () => {
    render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).not.toBeNull();
    });
  });

  it("closes dialog when close is called via useDialogInstance", async () => {
    render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-btn"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-btn"]')!);

    // dialog content is removed after close animation fallback timer (200ms)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).toBeNull();
    });
  });

  it("closes dialog when close() is called", async () => {
    render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-no-result"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-no-result"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).toBeNull();
    });
  });

  it("displays dialog header", async () => {
    render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      const modal = document.querySelector("[data-modal]");
      expect(modal).not.toBeNull();
      expect(modal!.textContent).toContain("테스트 다이얼로그");
    });
  });

  it("does not render header when header is not provided", async () => {
    render(() => (
      <DialogProvider>
        <TestAppNoHeader />
      </DialogProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).not.toBeNull();
    });
    const header = document.querySelector("[data-modal-header]");
    expect(header).toBeNull();
  });
});
