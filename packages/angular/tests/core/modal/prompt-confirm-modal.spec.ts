import { describe, it, expect } from "vitest";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import { SdPromptModal } from "../../../src/core/modal/sd-prompt-modal";
import { SdConfirmModal } from "../../../src/core/modal/sd-confirm-modal";
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

describe("Feature 5.3 Slice 2: SdPromptModal", () => {
  // Unit: 프롬프트 모달이 SdModalProvider를 통해 열리고 message가 표시된다
  it("showAsync로 프롬프트 모달이 열리고 message가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "이름을 입력하세요" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    const messageEl = modal!.querySelector("sd-prompt-modal > p");
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toContain("이름을 입력하세요");

    // cleanup: 취소
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);
    await promise;
  });

  // Unit: 텍스트 입력 후 확인 시 입력값이 반환된다
  it("텍스트 입력 후 확인 버튼 클릭 시 입력값이 Promise로 반환된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "이름을 입력하세요" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    // input에 값 입력
    const inputEl = modal!.querySelector("sd-textfield input") as HTMLInputElement;
    expect(inputEl).not.toBeNull();
    inputEl.value = "테스트 이름";
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(fixture);

    // 확인 버튼 클릭
    const confirmBtn = modal!.querySelectorAll("sd-button button")[0] as HTMLButtonElement;
    confirmBtn.click();
    await tick(fixture);

    const result = await promise;
    expect(result).toBe("테스트 이름");
  });

  // Unit: 취소 시 undefined 반환
  it("취소 버튼 클릭 시 undefined가 반환된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "이름을 입력하세요" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);

    const result = await promise;
    expect(result).toBeUndefined();
  });

  // Unit: 빈 입력으로 확인 시 닫히지 않음
  it("빈 입력 상태에서 확인 버튼 클릭 시 모달이 닫히지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "입력",
      type: SdPromptModal,
      inputs: { message: "이름을 입력하세요" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    // 확인 버튼 클릭 (입력 없이)
    const confirmBtn = modal!.querySelectorAll("sd-button button")[0] as HTMLButtonElement;
    confirmBtn.click();
    await tick(fixture);

    // 모달이 여전히 열려 있어야 한다
    expect(getModalInBody()).not.toBeNull();
    expect(provider.modalCount()).toBe(1);

    // cleanup
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);
    await promise;
  });
});

describe("Feature 5.3 Slice 2: SdConfirmModal", () => {
  // Unit: 확인 모달이 열리고 message가 표시된다
  it("showAsync로 확인 모달이 열리고 message가 표시된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "확인",
      type: SdConfirmModal,
      inputs: { message: "삭제하시겠습니까?" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    const messageEl = modal!.querySelector("sd-confirm-modal > p");
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toContain("삭제하시겠습니까?");

    // cleanup
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);
    await promise;
  });

  // Unit: 확인 클릭 시 true 반환
  it("확인 버튼 클릭 시 true가 반환된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "확인",
      type: SdConfirmModal,
      inputs: { message: "삭제하시겠습니까?" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    const confirmBtn = modal!.querySelectorAll("sd-button button")[0] as HTMLButtonElement;
    confirmBtn.click();
    await tick(fixture);

    const result = await promise;
    expect(result).toBe(true);
  });

  // Unit: 취소 클릭 시 undefined 반환
  it("취소 버튼 클릭 시 undefined가 반환된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalProviderTestHost],
    }).createComponent(SdModalProviderTestHost);
    fixture.detectChanges();

    const provider = TestBed.inject(SdModalProvider);
    const promise = provider.showAsync({
      title: "확인",
      type: SdConfirmModal,
      inputs: { message: "삭제하시겠습니까?" },
    });

    await tick(fixture);

    const modal = getModalInBody();
    const cancelBtn = modal!.querySelectorAll("sd-button button")[1] as HTMLButtonElement;
    cancelBtn.click();
    await tick(fixture);

    const result = await promise;
    expect(result).toBeUndefined();
  });
});
