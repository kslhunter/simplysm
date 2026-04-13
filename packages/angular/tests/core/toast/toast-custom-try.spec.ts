import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import {
  SdToastProviderTestHost,
  SdToastTestCustom,
} from "./sd-toast-test.fixture";
import { SdSystemLogProvider } from "../../../src/core/config/sd-system-log.provider";
import "@simplysm/core-browser";

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdToastProviderTestHost] });
  const fixture = TestBed.createComponent(SdToastProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

async function tick(fixture: any): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise((r) => setTimeout(r, 50));
  fixture.detectChanges();
  TestBed.flushEffects();
}

function getToastsInBody(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll("sd-toast"));
}

afterEach(() => {
  for (const el of document.body.querySelectorAll("sd-toast-container")) {
    el.remove();
  }
});

describe("Feature 3.3 Slice 3: 커스텀 토스트 + 에러 래핑", () => {
  // Acceptance: 커스텀 컴포넌트로 토스트 표시
  it("notify()로 커스텀 컴포넌트가 토스트 래퍼 안에 표시된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);

    void provider.notify({ type: SdToastTestCustom, inputs: {} });
    await tick(fixture);

    const toasts = getToastsInBody();
    expect(toasts.length).toBe(1);

    const customContent = toasts[0].querySelector("._custom-content");
    expect(customContent).not.toBeNull();
    expect(customContent!.textContent).toContain("커스텀 토스트");
  });

  // Acceptance: 커스텀 컴포넌트가 직접 닫기
  it("커스텀 컴포넌트가 close.emit()을 호출하면 토스트가 해제된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);

    void provider.notify({ type: SdToastTestCustom, inputs: {} });
    await tick(fixture);

    expect(getToastsInBody().length).toBe(1);

    // 커스텀 컴포넌트의 닫기 버튼 클릭 (close.emit('result') 트리거)
    const closeBtn = document.body.querySelector("sd-toast-test-custom ._close-btn") as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    await tick(fixture);

    // transitionend
    for (const t of getToastsInBody()) {
      t.dispatchEvent(new Event("transitionend"));
    }
    await tick(fixture);

    expect(getToastsInBody().length).toBe(0);
  });

  // Acceptance: try 성공
  it("try()에서 함수가 성공하면 결과값이 반환된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdToastProvider);

    const result = await provider.try(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  // Acceptance: try 실패 — Error 타입
  it("try()에서 Error가 발생하면 danger 토스트가 표시되고 writeAsync가 호출된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    const logProvider = TestBed.inject(SdSystemLogProvider);
    const writeSpy = vi.spyOn(logProvider, "writeAsync").mockResolvedValue();

    const result = await provider.try(() => Promise.reject(new Error("실패")));
    await tick(fixture);

    expect(result).toBeUndefined();
    expect(getToastsInBody().length).toBe(1);

    const toast = getToastsInBody()[0];
    expect(toast.getAttribute("data-sd-theme")).toBe("danger");
    expect(toast.querySelector("._message")!.textContent).toContain("실패");

    expect(writeSpy).toHaveBeenCalledWith("error", expect.stringContaining("실패"));
    writeSpy.mockRestore();
  });

  // Acceptance: try 실패 — 커스텀 메시지
  it("try()에서 messageFn이 제공되면 커스텀 메시지로 danger 토스트가 표시된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    const logProvider = TestBed.inject(SdSystemLogProvider);
    vi.spyOn(logProvider, "writeAsync").mockResolvedValue();

    const result = await provider.try(
      () => Promise.reject(new Error("원본")),
      (err) => `커스텀: ${(err).message}`,
    );
    await tick(fixture);

    expect(result).toBeUndefined();
    const toast = getToastsInBody()[0];
    expect(toast.querySelector("._message")!.textContent).toContain("커스텀: 원본");
  });

  // Acceptance: try 실패 — Error가 아닌 예외
  it("try()에서 Error가 아닌 예외가 발생하면 토스트 없이 re-throw된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdToastProvider);

    await expect(
      provider.try(() => Promise.reject("string-error" as unknown)),
    ).rejects.toBe("string-error");

    expect(getToastsInBody().length).toBe(0);
  });

  // Unit: try()에서 동기 함수도 처리 가능하다
  it("try()에서 동기 함수가 성공하면 결과가 Promise로 반환된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdToastProvider);

    const result = await provider.try(() => Promise.resolve("sync-result"));
    expect(result).toBe("sync-result");
  });

  // Unit: try()에서 Error의 stack이 없을 때 message가 로깅된다
  it("try()에서 Error의 stack이 undefined이면 message가 로깅된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    const logProvider = TestBed.inject(SdSystemLogProvider);
    const writeSpy = vi.spyOn(logProvider, "writeAsync").mockResolvedValue();

    const err = new Error("no-stack");
    err.stack = undefined;

    await provider.try(() => Promise.reject(err));
    await tick(fixture);

    expect(writeSpy).toHaveBeenCalledWith("error", "no-stack");
    writeSpy.mockRestore();
  });

});
