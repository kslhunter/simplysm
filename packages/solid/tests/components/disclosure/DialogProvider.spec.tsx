import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import type { Component } from "solid-js";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog, type DialogContentProps } from "../../../src/components/disclosure/DialogContext";

// 테스트용 다이얼로그 콘텐츠 컴포넌트
const TestContent: Component<DialogContentProps<string>> = (props) => (
  <div>
    <span data-testid="modal-content">다이얼로그 내용</span>
    <button data-testid="close-btn" onClick={() => props.close("result")}>
      닫기
    </button>
    <button data-testid="close-no-result" onClick={() => props.close()}>
      취소
    </button>
  </div>
);

// useDialog를 호출하는 테스트용 컴포넌트
function TestApp() {
  const dialog = useDialog();

  const openDialog = async () => {
    const result = await dialog.show(TestContent, { title: "테스트 다이얼로그" });
    document.body.setAttribute("data-modal-result", String(result ?? "undefined"));
  };

  return (
    <button data-testid="open-btn" onClick={openDialog}>
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

  it("close(result) 호출 시 Promise가 result로 resolve된다", async () => {
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

    await waitFor(() => {
      expect(document.body.getAttribute("data-modal-result")).toBe("result");
    });
  });

  it("close() 호출 시 Promise가 undefined로 resolve된다", async () => {
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
      expect(document.body.getAttribute("data-modal-result")).toBe("undefined");
    });
  });

  it("다이얼로그 제목이 표시된다", async () => {
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
});
