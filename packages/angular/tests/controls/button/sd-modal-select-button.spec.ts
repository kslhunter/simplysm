import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import {
  SdModalSelectButtonSingleTest,
  SdModalSelectButtonMultiTest,
  SdModalSelectButtonDisabledTest,
  SdModalSelectButtonRequiredTest,
  SdModalSelectButtonErasableTest,
  SdModalSelectButtonMultiErasableTest,
  SdModalSelectButtonEventTest,
  TestSelectModalComponent,
} from "./sd-modal-select-button-test.fixture";
import "@simplysm/core-browser";

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 50));
  fixture.detectChanges();
  TestBed.flushEffects();
}

describe("Feature 5.3 Slice 1: SdModalSelectButton", () => {
  // Acceptance: single 모드에서 모달로 항목 선택
  it("single 모드에서 검색 버튼 클릭 시 모달이 열리고, 선택 결과가 value에 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonSingleTest],
    }).createComponent(SdModalSelectButtonSingleTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const searchBtn = host.querySelector("._button sd-button button") as HTMLElement;
    expect(searchBtn).not.toBeNull();

    // SdModalProvider.showAsync를 spy
    const modalProvider = TestBed.inject(SdModalProvider);
    const showAsyncSpy = vi.spyOn(modalProvider, "showAsync").mockResolvedValue({
      selectedKeys: [42],
    });

    searchBtn.click();
    await tick(fixture);

    // 모달이 호출되었는지
    expect(showAsyncSpy).toHaveBeenCalledTimes(1);
    const callArgs = showAsyncSpy.mock.calls[0][0];
    expect(callArgs.type).toBe(TestSelectModalComponent);

    // value가 반영되었는지 (single → 단일값)
    expect(fixture.componentInstance.value()).toBe(42);
  });

  // Acceptance: multi 모드에서 모달로 여러 항목 선택
  it("multi 모드에서 검색 버튼 클릭 시 모달이 열리고, 선택 결과가 배열로 value에 반영된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonMultiTest],
    }).createComponent(SdModalSelectButtonMultiTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const searchBtn = host.querySelector("._button sd-button button") as HTMLElement;
    expect(searchBtn).not.toBeNull();

    const modalProvider = TestBed.inject(SdModalProvider);
    const showAsyncSpy = vi.spyOn(modalProvider, "showAsync").mockResolvedValue({
      selectedKeys: [1, 2, 3],
    });

    searchBtn.click();
    await tick(fixture);

    expect(showAsyncSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.value()).toEqual([1, 2, 3]);
  });

  // Acceptance: 모달 취소 시 기존 값 유지
  it("모달을 취소(undefined 반환)하면 기존 value가 유지된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonSingleTest],
    }).createComponent(SdModalSelectButtonSingleTest);
    fixture.componentInstance.value.set(10);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const searchBtn = host.querySelector("._button sd-button button") as HTMLElement;

    const modalProvider = TestBed.inject(SdModalProvider);
    vi.spyOn(modalProvider, "showAsync").mockResolvedValue(undefined);

    searchBtn.click();
    await tick(fixture);

    // 기존 값 유지
    expect(fixture.componentInstance.value()).toBe(10);
  });

  // Acceptance: single 모드에서 선택 취소
  it("single 모드에서 취소(eraser) 버튼 클릭 시 value가 undefined가 된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonErasableTest],
    }).createComponent(SdModalSelectButtonErasableTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toBe(1);

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const eraserBtn = host.querySelector("[data-sd-eraser]") as HTMLElement;
    expect(eraserBtn).not.toBeNull();

    eraserBtn.click();
    await tick(fixture);

    expect(fixture.componentInstance.value()).toBeUndefined();
  });

  // Acceptance: multi 모드에서 선택 취소
  it("multi 모드에서 취소(eraser) 버튼 클릭 시 value가 빈 배열이 된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonMultiErasableTest],
    }).createComponent(SdModalSelectButtonMultiErasableTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.value()).toEqual([1, 2]);

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const eraserBtn = host.querySelector("[data-sd-eraser]") as HTMLElement;
    expect(eraserBtn).not.toBeNull();

    eraserBtn.click();
    await tick(fixture);

    expect(fixture.componentInstance.value()).toEqual([]);
  });

  // Acceptance: required일 때 취소 버튼 미표시
  it("required=true이면 취소(eraser) 버튼이 표시되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonRequiredTest],
    }).createComponent(SdModalSelectButtonRequiredTest);
    fixture.componentInstance.value.set(1);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const eraserBtn = host.querySelector("[data-sd-eraser]");
    expect(eraserBtn).toBeNull();
  });

  // Acceptance: disabled일 때 버튼 비활성
  it("disabled=true이면 검색 버튼과 취소 버튼 모두 표시되지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonDisabledTest],
    }).createComponent(SdModalSelectButtonDisabledTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    // disabled 상태에서는 검색 버튼과 취소 버튼 모두 표시되지 않아야 한다
    const searchBtn = host.querySelector("._button sd-button button");
    const eraserBtn = host.querySelector("[data-sd-eraser]");
    expect(searchBtn).toBeNull();
    expect(eraserBtn).toBeNull();
  });

  // Acceptance: search 버튼 클릭 시 이벤트 전파 차단
  it("search 버튼 클릭 시 부모 요소로 이벤트가 전파되지 않는다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonEventTest],
    }).createComponent(SdModalSelectButtonEventTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    const searchBtn = host.querySelector("._button sd-button button") as HTMLElement;
    expect(searchBtn).not.toBeNull();

    // 모달 호출 모킹
    const modalProvider = TestBed.inject(SdModalProvider);
    vi.spyOn(modalProvider, "showAsync").mockResolvedValue(undefined);

    searchBtn.click();
    await tick(fixture);

    // 부모의 click 리스너가 호출되지 않아야 한다
    expect(fixture.componentInstance.parentClicked()).toBe(false);
  });

  // Acceptance: required인데 값이 없으면 invalid 표시
  it("required=true이고 value가 없으면 setupInvalid로 유효성 검증 실패가 표시된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdModalSelectButtonRequiredTest],
    }).createComponent(SdModalSelectButtonRequiredTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const host = fixture.nativeElement.querySelector("sd-modal-select-button") as HTMLElement;
    // setupInvalid는 hidden input에 setCustomValidity를 설정하므로, checkValidity가 false여야 한다
    const hiddenInput = host.querySelector("input.sd-invalid-input") as HTMLInputElement;
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput.checkValidity()).toBe(false);
  });
});
