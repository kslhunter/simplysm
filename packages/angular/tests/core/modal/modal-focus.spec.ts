import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import {
  SdModalTestFocusable,
  SdModalFocusTestHost,
  SdModalProviderTestHost,
} from "./sd-modal-test.fixture";
import "@simplysm/core-browser";

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdModalFocusTestHost] });
  const fixture = TestBed.createComponent(SdModalFocusTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 100));
  fixture.detectChanges();
  TestBed.flushEffects();
}

function getModalInBody(): HTMLElement | null {
  return document.body.querySelector("sd-modal");
}

describe("Feature 3.2 Slice 4: 포커스 관리", () => {
  // Acceptance: 모달 열림 시 첫 포커싱 가능 요소에 포커스
  it("모달이 열리면 모달 내 첫 포커싱 가능 요소에 포커스가 이동한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Focus Test", type: SdModalTestFocusable, inputs: { title: "test" } },
    );

    await tick(fixture);

    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    const firstInput = modal!.querySelector(".first-input") as HTMLElement;
    expect(document.activeElement).toBe(firstInput);

    // cleanup
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    await tick(fixture);
    await promise;
  });

  // Acceptance: noFirstControlFocusing 옵션
  it("noFirstControlFocusing=true이면 다이얼로그 자체에 포커스가 설정된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Focus Test", type: SdModalTestFocusable, inputs: { title: "test" } },
      { noFirstControlFocusing: true },
    );

    await tick(fixture);

    const modal = getModalInBody();
    const dialog = modal!.querySelector("._dialog") as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    // cleanup
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    await tick(fixture);
    await promise;
  });

  // Acceptance: 모달 닫힘 시 이전 요소로 포커스 복귀
  it("모달 닫힘 시 이전에 포커스되었던 요소로 복귀한다", async () => {
    const fixture = setupHost();
    const triggerBtn = fixture.nativeElement.querySelector(".trigger-btn") as HTMLElement;
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync(
      { title: "Focus Test", type: SdModalTestFocusable, inputs: { title: "test" } },
    );

    await tick(fixture);

    // 모달 닫기
    const modal = getModalInBody();
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    await tick(fixture);
    await promise;

    expect(document.activeElement).toBe(triggerBtn);
  });

  // Acceptance: Tab 키 순환 순방향
  // 모달 내 마지막 focusable(last-input)에서 Tab → 모달 내 첫 focusable(close-btn)로 순환
  it("마지막 포커싱 가능 요소에서 Tab 누르면 첫 요소로 순환한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Focus Test", type: SdModalTestFocusable, inputs: { title: "test" } },
    );

    await tick(fixture);

    const modal = getModalInBody();
    const _dialog = modal!.querySelector("._dialog") as HTMLElement;
    const lastInput = modal!.querySelector(".last-input") as HTMLElement;
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;

    // 마지막 요소에 포커스
    lastInput.focus();
    expect(document.activeElement).toBe(lastInput);

    // Tab 키 (lastInput에서 발생, bubbles up to dialog)
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    lastInput.dispatchEvent(tabEvent);

    // 모달 내 첫 focusable 요소(close-btn)로 순환
    expect(document.activeElement).toBe(closeBtn);

    // cleanup
    closeBtn.click();
    await tick(fixture);
    await promise;
  });

  // Acceptance: Tab 키 순환 역방향
  // 모달 내 첫 focusable(close-btn)에서 Shift+Tab → 모달 내 마지막 focusable(last-input)로 순환
  it("첫 포커싱 가능 요소에서 Shift+Tab 누르면 마지막 요소로 순환한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Focus Test", type: SdModalTestFocusable, inputs: { title: "test" } },
    );

    await tick(fixture);

    const modal = getModalInBody();
    const _dialog = modal!.querySelector("._dialog") as HTMLElement;
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    const lastInput = modal!.querySelector(".last-input") as HTMLElement;

    // 첫 focusable 요소(close-btn)에 포커스
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab 키 (close-btn에서 발생, bubbles up to dialog)
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    closeBtn.dispatchEvent(shiftTabEvent);

    expect(document.activeElement).toBe(lastInput);

    // cleanup
    closeBtn.click();
    await tick(fixture);
    await promise;
  });

  // Acceptance: 다중 모달 z-index 관리
  it("모달 A 위에 모달 B를 열면 B의 z-index가 더 높고, A를 클릭하면 A가 더 높아진다", async () => {
    TestBed.configureTestingModule({ imports: [SdModalProviderTestHost] });
    const fixture = TestBed.createComponent(SdModalProviderTestHost);
    fixture.detectChanges();
    TestBed.flushEffects();

    const provider = TestBed.inject(SdModalProvider);

    // 모달 A 열기
    const promiseA = provider.showAsync(
      { title: "Modal A", type: SdModalTestFocusable, inputs: { title: "A" } },
    );
    await tick(fixture);

    // 모달 B 열기
    const promiseB = provider.showAsync(
      { title: "Modal B", type: SdModalTestFocusable, inputs: { title: "B" } },
    );
    await tick(fixture);

    const modals = Array.from(document.body.querySelectorAll<HTMLElement>("sd-modal"));
    expect(modals.length).toBe(2);

    // B가 나중에 열렸으므로 z-index가 더 높아야 함
    const zIndexA = parseInt(modals[0].style.zIndex !== "" ? modals[0].style.zIndex : "0", 10);
    const zIndexB = parseInt(modals[1].style.zIndex !== "" ? modals[1].style.zIndex : "0", 10);
    expect(zIndexB).toBeGreaterThan(zIndexA);

    // A의 dialog를 클릭하면 A의 z-index가 B보다 높아짐
    const dialogA = modals[0].querySelector("._dialog") as HTMLElement;
    dialogA.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();

    const newZIndexA = parseInt(modals[0].style.zIndex !== "" ? modals[0].style.zIndex : "0", 10);
    const newZIndexB = parseInt(modals[1].style.zIndex !== "" ? modals[1].style.zIndex : "0", 10);
    expect(newZIndexA).toBeGreaterThan(newZIndexB);

    // cleanup
    for (const modal of modals) {
      const closeBtn = modal.querySelector<HTMLElement>("._close-btn");
      if (closeBtn != null) closeBtn.click();
    }
    await tick(fixture);
    await Promise.allSettled([promiseA, promiseB]);
  });
});
