import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-save-command-event.plugin";
import { SdRefreshCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-refresh-command-event.plugin";
import { SdInsertCommandEventPlugin } from "../../../../src/core/plugins/commands/sd-insert-command-event.plugin";
import { findTopOpenModalEl } from "../../../../src/core/plugins/commands/findTopOpenModalEl";

function injectPlugin<T>(cls: new (...args: any[]) => T): T {
  TestBed.configureTestingModule({
    providers: [{ provide: EVENT_MANAGER_PLUGINS, useClass: cls, multi: true }],
  });
  const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
  return plugins.find((p) => p instanceof cls)! as T;
}

function createOpenModal(zIndex: number): HTMLElement {
  const modal = document.createElement("sd-modal");
  modal.setAttribute("data-sd-open", "");
  modal.style.zIndex = String(zIndex);
  document.body.appendChild(modal);
  return modal;
}

describe("findTopOpenModalEl", () => {
  let cleanupModals: HTMLElement[] = [];

  afterEach(() => {
    for (const m of cleanupModals) {
      m.remove();
    }
    cleanupModals = [];
  });

  it("모달이 없으면 null을 반환한다", () => {
    expect(findTopOpenModalEl()).toBeNull();
  });

  it("열린 모달이 하나면 해당 모달을 반환한다", () => {
    const modal = createOpenModal(4001);
    cleanupModals.push(modal);
    expect(findTopOpenModalEl()).toBe(modal);
  });

  it("data-sd-open 없는 모달은 무시한다", () => {
    const closedModal = document.createElement("sd-modal");
    closedModal.style.zIndex = "5000";
    document.body.appendChild(closedModal);
    cleanupModals.push(closedModal);

    expect(findTopOpenModalEl()).toBeNull();
  });

  it("여러 모달 중 zIndex가 가장 큰 모달을 반환한다", () => {
    const modalA = createOpenModal(4001);
    const modalB = createOpenModal(4003);
    const modalC = createOpenModal(4002);
    cleanupModals.push(modalA, modalB, modalC);

    expect(findTopOpenModalEl()).toBe(modalB);
  });
});

describe("Feature 3.2.1 Slice 2: 커맨드 플러그인 모달 컨텍스트 필터링", () => {
  let cleanupModals: HTMLElement[] = [];

  afterEach(() => {
    for (const m of cleanupModals) {
      m.remove();
    }
    cleanupModals = [];
  });

  describe("Rule: 커맨드 이벤트는 최상위 모달 컨텍스트로 제한된다", () => {
    it("Scenario: 모달 없이 페이지에서 커맨드 실행 -> 핸들러 실행", () => {
      const plugin = injectPlugin(SdSaveCommandEventPlugin);
      const element = document.createElement("div");
      document.body.appendChild(element);
      const handler = vi.fn();
      const cleanup = plugin.addEventListener(element, "sdSaveCommand", handler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      element.remove();
    });

    it("Scenario: 모달이 열린 상태에서 모달 내부 핸들러만 실행", () => {
      const plugin = injectPlugin(SdSaveCommandEventPlugin);

      // 모달 생성
      const modal = createOpenModal(4001);
      cleanupModals.push(modal);

      // 모달 내부 요소
      const modalElement = document.createElement("div");
      modal.appendChild(modalElement);
      const modalHandler = vi.fn();
      const modalCleanup = plugin.addEventListener(modalElement, "sdSaveCommand", modalHandler);

      // 페이지 요소 (모달 외부)
      const pageElement = document.createElement("div");
      document.body.appendChild(pageElement);
      const pageHandler = vi.fn();
      const pageCleanup = plugin.addEventListener(pageElement, "sdSaveCommand", pageHandler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

      expect(modalHandler).toHaveBeenCalledTimes(1);
      expect(pageHandler).not.toHaveBeenCalled();

      modalCleanup();
      pageCleanup();
      pageElement.remove();
    });

    it("Scenario: 중첩 모달에서 최상위 모달의 커맨드만 실행", () => {
      const plugin = injectPlugin(SdSaveCommandEventPlugin);

      // 모달 A (z-index 4001)
      const modalA = createOpenModal(4001);
      cleanupModals.push(modalA);
      const elementA = document.createElement("div");
      modalA.appendChild(elementA);
      const handlerA = vi.fn();
      const cleanupA = plugin.addEventListener(elementA, "sdSaveCommand", handlerA);

      // 모달 B (z-index 4002, 최상위)
      const modalB = createOpenModal(4002);
      cleanupModals.push(modalB);
      const elementB = document.createElement("div");
      modalB.appendChild(elementB);
      const handlerB = vi.fn();
      const cleanupB = plugin.addEventListener(elementB, "sdSaveCommand", handlerB);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(handlerA).not.toHaveBeenCalled();

      cleanupA();
      cleanupB();
    });

    it("Scenario: 최상위 모달에 해당 커맨드 핸들러가 없으면 이벤트 소멸", () => {
      const plugin = injectPlugin(SdSaveCommandEventPlugin);

      // 모달 생성 (내부에 핸들러 없음)
      const modal = createOpenModal(4001);
      cleanupModals.push(modal);

      // 페이지에 핸들러 등록 (모달 외부)
      const pageElement = document.createElement("div");
      document.body.appendChild(pageElement);
      const pageHandler = vi.fn();
      const pageCleanup = plugin.addEventListener(pageElement, "sdSaveCommand", pageHandler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

      // D1: 핸들러 부재 시 이벤트 소멸 — 페이지 핸들러도 실행되지 않는다
      expect(pageHandler).not.toHaveBeenCalled();

      pageCleanup();
      pageElement.remove();
    });

    it("Scenario: 모든 커맨드 플러그인에 동일하게 적용 (Refresh)", () => {
      const plugin = injectPlugin(SdRefreshCommandEventPlugin);

      const modal = createOpenModal(4001);
      cleanupModals.push(modal);

      // 모달 내부
      const modalElement = document.createElement("div");
      modal.appendChild(modalElement);
      const modalHandler = vi.fn();
      const modalCleanup = plugin.addEventListener(modalElement, "sdRefreshCommand", modalHandler);

      // 페이지
      const pageElement = document.createElement("div");
      document.body.appendChild(pageElement);
      const pageHandler = vi.fn();
      const pageCleanup = plugin.addEventListener(pageElement, "sdRefreshCommand", pageHandler);

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "l", ctrlKey: true, altKey: true }),
      );

      expect(modalHandler).toHaveBeenCalledTimes(1);
      expect(pageHandler).not.toHaveBeenCalled();

      modalCleanup();
      pageCleanup();
      pageElement.remove();
    });

    it("Scenario: 모든 커맨드 플러그인에 동일하게 적용 (Insert)", () => {
      const plugin = injectPlugin(SdInsertCommandEventPlugin);

      const modal = createOpenModal(4001);
      cleanupModals.push(modal);

      // 모달 내부
      const modalElement = document.createElement("div");
      modal.appendChild(modalElement);
      const modalHandler = vi.fn();
      const modalCleanup = plugin.addEventListener(modalElement, "sdInsertCommand", modalHandler);

      // 페이지
      const pageElement = document.createElement("div");
      document.body.appendChild(pageElement);
      const pageHandler = vi.fn();
      const pageCleanup = plugin.addEventListener(pageElement, "sdInsertCommand", pageHandler);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Insert", ctrlKey: true }));

      expect(modalHandler).toHaveBeenCalledTimes(1);
      expect(pageHandler).not.toHaveBeenCalled();

      modalCleanup();
      pageCleanup();
      pageElement.remove();
    });
  });
});
