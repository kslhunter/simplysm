import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import { DialogProvider, useDialog } from "../../../src/components/disclosure/Dialog";
import { I18nProvider } from "../../../src/providers/i18n/I18nContext";
import { ConfigProvider } from "../../../src/providers/ConfigContext";

// dialog content component for testing
function TestContent(props: { close?: (result?: string) => void }) {
  return (
    <div>
      <span data-testid="dialog-content">다이얼로그 내용</span>
      <button data-testid="close-btn" onClick={() => props.close?.("result")}>
        닫기
      </button>
      <button data-testid="close-no-result" onClick={() => props.close?.()}>
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
        void dialog.show(TestContent, {}, { header: "테스트 다이얼로그" });
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
        void dialog.show(TestContent, {}, {});
      }}
    >
      다이얼로그 열기
    </button>
  );
}

describe("DialogProvider", () => {
  beforeEach(() => {
    localStorage.setItem("test.i18n-locale", JSON.stringify("en"));
  });

  it("displays dialog via show()", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).not.toBeNull();
    });
  });

  it("closes dialog when close is called via props", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-btn"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-btn"]')!);

    // dialog content is removed after close animation fallback timer (200ms)
    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).toBeNull();
    });
  });

  it("closes dialog when close() is called without result", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-no-result"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-no-result"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).toBeNull();
    });
  });

  it("displays dialog header", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestApp />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      const dialog = document.querySelector("[data-dialog]");
      expect(dialog).not.toBeNull();
      expect(dialog!.textContent).toContain("테스트 다이얼로그");
    });
  });

  it("does not render header when header is not provided", async () => {
    render(() => (
      <ConfigProvider clientName="test">
        <I18nProvider>
          <DialogProvider>
            <TestAppNoHeader />
          </DialogProvider>
        </I18nProvider>
      </ConfigProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="dialog-content"]')).not.toBeNull();
    });
    const header = document.querySelector("[data-dialog-header]");
    expect(header).toBeNull();
  });
});
