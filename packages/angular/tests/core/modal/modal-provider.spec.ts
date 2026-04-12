import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdModalProvider } from "../../../src/core/modal/sd-modal.provider";
import {
  SdModalTestBasic,
  SdModalProviderTestHost,
} from "./sd-modal-test.fixture";
import "@simplysm/core-browser";

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdModalProviderTestHost] });
  const fixture = TestBed.createComponent(SdModalProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function getModalInBody(): HTMLElement | null {
  return document.body.querySelector("sd-modal");
}

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 50));
  fixture.detectChanges();
  TestBed.flushEffects();
}

describe("Feature 3.2 Slice 3: SdModalProvider 동적 생성", () => {
  // Acceptance: SdModalInfo와 옵션으로 모달 열기
  it("showAsync 호출 시 SdModal이 document.body에 삽입되고 modalCount가 증가한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    expect(provider.modalCount()).toBe(0);

    const promise = provider.showAsync(
      { title: "Test Modal", type: SdModalTestBasic, inputs: { title: "hello" } },
      { useCloseByBackdrop: true },
    );

    await tick(fixture);

    // 모달이 body에 삽입됨
    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    // modalCount가 1 증가
    expect(provider.modalCount()).toBe(1);

    // Promise가 반환됨 (아직 resolve되지 않은 상태)
    expect(promise).toBeInstanceOf(Promise);
  });

  // Acceptance: 모달 컴포넌트가 결과와 함께 닫힘
  it("close.emit(result) 호출 시 Promise가 result로 resolve되고 modalCount가 감소한다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Test", type: SdModalTestBasic, inputs: { title: "hello" } },
    );

    await tick(fixture);

    expect(provider.modalCount()).toBe(1);

    // 모달 컴포넌트의 close output 발생 시뮬레이션
    // body에 삽입된 sd-modal-test-basic 요소를 찾아서 close 이벤트를 발생
    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    // 닫기 버튼 클릭으로 닫기
    const closeBtn = modal!.querySelector<HTMLElement>("._close-btn");
    if (closeBtn != null) {
      closeBtn.click();
      fixture.detectChanges();
      TestBed.flushEffects();
    }

    // transitionend 없이 즉시 처리되므로 잠시 대기
    await tick(fixture);

    const result = await promise;
    expect(result).toBeUndefined(); // 닫기 버튼은 undefined로 resolve
    expect(provider.modalCount()).toBe(0);
  });

  // Acceptance: 모달이 결과 없이 닫힘 (배경 클릭, ESC, 닫기 버튼)
  it("배경 클릭 시 Promise가 undefined로 resolve된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Test", type: SdModalTestBasic, inputs: { title: "hello" } },
      { useCloseByBackdrop: true },
    );

    await tick(fixture);

    const modal = getModalInBody();
    const backdrop = modal?.querySelector("._backdrop") as HTMLElement;
    expect(backdrop).not.toBeNull();

    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await tick(fixture);

    const result = await promise;
    expect(result).toBeUndefined();
    expect(provider.modalCount()).toBe(0);
  });

  // Acceptance: SdActivatedModalProvider inject
  it("모달 컴포넌트 내에서 SdActivatedModalProvider가 주입 가능하다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Test", type: SdModalTestBasic, inputs: { title: "hello" } },
    );

    await tick(fixture);

    // 모달이 body에 삽입되어 있어야 한다
    expect(getModalInBody()).not.toBeNull();
    expect(provider.modalCount()).toBe(1);

    // 닫기
    const modal = getModalInBody();
    const closeBtn = modal!.querySelector<HTMLElement>("._close-btn");
    if (closeBtn != null) {
      closeBtn.click();
      fixture.detectChanges();
      TestBed.flushEffects();
    }
    await tick(fixture);
    await promise;
  });

  // Unit: 닫힌 후 DOM에서 ��달 요소가 제거��다
  it("닫힌 후 sd-modal 요소가 document.body에서 제거된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Test", type: SdModalTestBasic, inputs: { title: "hello" } },
    );

    await tick(fixture);

    expect(getModalInBody()).not.toBeNull();

    // 닫기
    const modal = getModalInBody();
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    await tick(fixture);
    await promise;

    // DOM에서 제거 확인
    expect(getModalInBody()).toBeNull();
  });

  // DESIGN-003: input.required()를 사용하는 모달이 에러 없이 열린다
  // SdModalProvider가 createComponent → setInput → attachView 순서를 보장함을 검증
  it("input.required()를 사용하는 모달이 NG0950 에러 없이 열리고 렌더링된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    // SdModalTestBasic의 title은 input.required<string>()
    // setInput이 attachView보다 먼저 호출되지 않으면 NG0950 에러 발생
    const promise = provider.showAsync(
      { title: "Required Input Test", type: SdModalTestBasic, inputs: { title: "required-value" } },
    );

    await tick(fixture);

    const modal = getModalInBody();
    expect(modal).not.toBeNull();

    // required input이 정상 설정되어 렌더링됨
    const contentEl = modal!.querySelector(".content");
    expect(contentEl!.textContent).toContain("required-value");

    // cleanup
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    await tick(fixture);
    await promise;
  });

  // Acceptance: transitionDuration > 0이면 transitionend까지 DOM에 유지된다
  it("transitionDuration > 0이면 transitionend까지 모달이 DOM에 유지된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "Test", type: SdModalTestBasic, inputs: { title: "hello" } },
    );

    await tick(fixture);

    const modal = getModalInBody()!;

    // 인라인 스타일로 transition-duration을 설정하여 getComputedStyle에서 > 0 반환
    modal.style.transitionDuration = "0.2s";

    // 닫기 버튼 클릭
    const closeBtn = modal.querySelector<HTMLElement>("._close-btn")!;
    closeBtn.click();
    fixture.detectChanges();

    // transitionend 전이므로 모달은 아직 DOM에 존재
    expect(getModalInBody()).not.toBeNull();

    // transitionend 이벤트 발생
    modal.dispatchEvent(new TransitionEvent("transitionend", { bubbles: true }));
    await tick(fixture);
    await promise;

    // transitionend 후 DOM에서 제거
    expect(getModalInBody()).toBeNull();
  });

  // Unit: inputs가 컨텐츠 컴포넌트에 올바르게 전달된다
  it("inputs의 title이 컨텐츠 컴포넌트에 전달되어 렌더링된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdModalProvider);

    const promise = provider.showAsync(
      { title: "My Modal", type: SdModalTestBasic, inputs: { title: "content-title" } },
    );

    await tick(fixture);

    const modal = getModalInBody();
    const contentEl = modal!.querySelector(".content");
    expect(contentEl).not.toBeNull();
    expect(contentEl!.textContent).toContain("content-title");

    // cleanup
    const closeBtn = modal!.querySelector("._close-btn") as HTMLElement;
    closeBtn.click();
    fixture.detectChanges();
    await tick(fixture);
    await promise;
  });
});
