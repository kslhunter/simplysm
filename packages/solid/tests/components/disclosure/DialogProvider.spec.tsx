import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { useDialogInstance } from "../../../src/components/disclosure/DialogInstanceContext";

// 테스트용 다이얼로그 콘텐츠 컴포넌트
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

// useDialog를 호출하는 테스트용 컴포넌트
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

// header 없이 열리는 테스트용 컴포넌트
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
  it("show()로 다이얼로그가 표시된다", async () => {
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

  it("useDialogInstance로 close를 호출하면 다이얼로그가 닫힌다", async () => {
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

    // 닫힘 애니메이션 fallback timer(200ms) 후 다이얼로그 콘텐츠가 제거됨
    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).toBeNull();
    });
  });

  it("close() 호출 시 다이얼로그가 닫힌다", async () => {
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

  it("다이얼로그 header가 표시된다", async () => {
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

  it("header 미제공 시 헤더가 렌더링되지 않는다", async () => {
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
