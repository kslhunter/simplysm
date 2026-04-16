import { describe, it, expect, afterEach } from "vitest";
import {
  findTopOpenModalEl,
  shouldProcessCommandEvent,
} from "../../../src/core/commands/findTopOpenModalEl";

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
    expect(findTopOpenModalEl(document)).toBeNull();
  });

  it("열린 모달이 하나면 해당 모달을 반환한다", () => {
    const modal = createOpenModal(4001);
    cleanupModals.push(modal);
    expect(findTopOpenModalEl(document)).toBe(modal);
  });

  it("data-sd-open 없는 모달은 무시한다", () => {
    const closedModal = document.createElement("sd-modal");
    closedModal.style.zIndex = "5000";
    document.body.appendChild(closedModal);
    cleanupModals.push(closedModal);

    expect(findTopOpenModalEl(document)).toBeNull();
  });

  it("여러 모달 중 zIndex가 가장 큰 모달을 반환한다", () => {
    const modalA = createOpenModal(4001);
    const modalB = createOpenModal(4003);
    const modalC = createOpenModal(4002);
    cleanupModals.push(modalA, modalB, modalC);

    expect(findTopOpenModalEl(document)).toBe(modalB);
  });
});

describe("shouldProcessCommandEvent", () => {
  let cleanupModals: HTMLElement[] = [];

  afterEach(() => {
    for (const m of cleanupModals) {
      m.remove();
    }
    cleanupModals = [];
  });

  it("열린 모달이 없으면 true를 반환한다", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    expect(shouldProcessCommandEvent(document, element)).toBe(true);
    element.remove();
  });

  it("요소가 최상위 모달 내부이면 true를 반환한다", () => {
    const modal = createOpenModal(4001);
    cleanupModals.push(modal);
    const element = document.createElement("div");
    modal.appendChild(element);

    expect(shouldProcessCommandEvent(document, element)).toBe(true);
  });

  it("요소가 최상위 모달 외부이면 false를 반환한다", () => {
    const modal = createOpenModal(4001);
    cleanupModals.push(modal);
    const element = document.createElement("div");
    document.body.appendChild(element);

    expect(shouldProcessCommandEvent(document, element)).toBe(false);
    element.remove();
  });
});
