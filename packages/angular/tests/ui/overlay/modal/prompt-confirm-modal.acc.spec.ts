import { describe, it, expect } from "vitest";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../../src/ui/overlay/modal/sd-modal.provider";
import { SdPromptModal } from "../../../../src/ui/overlay/modal/sd-prompt-modal";
import { SdConfirmModal } from "../../../../src/ui/overlay/modal/sd-confirm-modal";
import { SdModalProviderTestHost } from "./sd-modal-test.fixture";
import "@simplysm/core-browser";

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.inject(ApplicationRef).tick();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 50));
  fixture.detectChanges();
  TestBed.inject(ApplicationRef).tick();
  TestBed.flushEffects();
}

function getModalInBody(): HTMLElement | null {
  return document.body.querySelector("sd-modal");
}

describe("Feature 1.1: sd-confirm-modal 템플릿 정리", () => {
  it("래퍼 div 없이 호스트 직속으로 렌더링되고 유틸리티 클래스가 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "확인",
      type: SdConfirmModal,
      inputs: { message: "테스트" },
    });
    await tick(fixture);

    const modal = getModalInBody();
    const confirmModal = modal!.querySelector("sd-confirm-modal")!;

    // 래퍼 div가 없다
    expect(confirmModal.querySelector("._sd-confirm-modal")).toBeNull();

    // 호스트에 p-default 클래스
    expect(confirmModal.classList.contains("p-default")).toBe(true);

    // p 요소가 호스트 직속
    const p = confirmModal.querySelector(":scope > p");
    expect(p).not.toBeNull();
    expect(p!.classList.contains("mb-default")).toBe(true);

    // actions div에 유틸리티 클래스
    const actionsDiv = confirmModal.querySelector(":scope > div");
    expect(actionsDiv).not.toBeNull();
    expect(actionsDiv!.classList.contains("flex-row")).toBe(true);
    expect(actionsDiv!.classList.contains("main-align-end")).toBe(true);
    expect(actionsDiv!.classList.contains("gap-sm")).toBe(true);

    // cleanup
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);
    await promise;
  });
});

describe("Feature 1.1: sd-prompt-modal 템플릿 정리", () => {
  it("래퍼 div 없이 sd-textfield를 사용하고 유틸리티 클래스가 적용된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "테스트" },
    });
    await tick(fixture);

    const modal = getModalInBody();
    const promptModal = modal!.querySelector("sd-prompt-modal")!;

    // 래퍼 div가 없다
    expect(promptModal.querySelector("._sd-prompt-modal")).toBeNull();

    // 호스트에 p-default 클래스
    expect(promptModal.classList.contains("p-default")).toBe(true);

    // sd-textfield 사용 (raw input._input 없음)
    expect(promptModal.querySelector("sd-textfield")).not.toBeNull();
    expect(promptModal.querySelector(":scope > input")).toBeNull();

    // cleanup
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);
    await promise;
  });

  it("Enter 키로 확인이 가능하다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "테스트" },
    });
    await tick(fixture);

    const modal = getModalInBody();
    const inputEl = modal!.querySelector("sd-textfield input") as HTMLInputElement;
    inputEl.value = "엔터 테스트";
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(fixture);

    // Enter 키 디스패치
    inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick(fixture);

    const result = await promise;
    expect(result).toBe("엔터 테스트");
  });
});
