import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import type { Component } from "solid-js";
import { ModalProvider } from "../../../src/components/disclosure/ModalProvider";
import { useModal, type ModalContentProps } from "../../../src/components/disclosure/ModalContext";

// 테스트용 모달 콘텐츠 컴포넌트
const TestContent: Component<ModalContentProps<string>> = (props) => (
  <div>
    <span data-testid="modal-content">모달 내용</span>
    <button data-testid="close-btn" onClick={() => props.close("result")}>닫기</button>
    <button data-testid="close-no-result" onClick={() => props.close()}>취소</button>
  </div>
);

// useModal을 호출하는 테스트용 컴포넌트
function TestApp() {
  const modal = useModal();

  const openModal = async () => {
    const result = await modal.show(TestContent, { title: "테스트 모달" });
    document.body.setAttribute("data-modal-result", String(result ?? "undefined"));
  };

  return (
    <button data-testid="open-btn" onClick={openModal}>모달 열기</button>
  );
}

describe("ModalProvider", () => {
  it("show()로 모달이 표시된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).not.toBeNull();
    });
  });

  it("close(result) 호출 시 Promise가 result로 resolve된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
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
      <ModalProvider>
        <TestApp />
      </ModalProvider>
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

  it("모달 제목이 표시된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      const modal = document.querySelector("[data-modal]");
      expect(modal).not.toBeNull();
      expect(modal!.textContent).toContain("테스트 모달");
    });
  });
});
