import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdToastProviderTestHost } from "./sd-toast-test.fixture";
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

function flushSync(fixture: any): void {
  fixture.detectChanges();
  TestBed.flushEffects();
}

function getToastsInBody(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll("sd-toast"));
}

afterEach(() => {
  // cleanup: body에 남은 토스트 요소 제거
  for (const el of document.body.querySelectorAll("sd-toast-container")) {
    el.remove();
  }
});

describe("Feature 3.3 Slice 2: SdToastProvider 기본 + 프로그래스", () => {
  // Acceptance: alertThemes에 포함된 심각도로 토스트 표시
  it("alertThemes에 danger가 포함되어 있으면 alert()가 호출되고 토스트는 생성되지 않는다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    provider.alertThemes.set(["danger"]);

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    provider.danger("에러");
    await tick(fixture);

    expect(alertSpy).toHaveBeenCalledWith("에러");
    expect(getToastsInBody().length).toBe(0);
    alertSpy.mockRestore();
  });

  // Acceptance: beforeShowFn 콜백 실행
  it("beforeShowFn이 설정되어 있으면 토스트 표시 전에 호출된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    const callOrder: string[] = [];
    provider.beforeShowFn = (theme) => {
      callOrder.push(`beforeShow:${theme}`);
    };

    provider.info("테스트");
    await tick(fixture);

    expect(callOrder).toContain("beforeShow:info");
    expect(getToastsInBody().length).toBe(1);
  });

  // Acceptance: overlap 모드에서 토스트 표시
  it("overlap=true이면 새 토스트 표시 시 기존 토스트가 모두 제거되고 새 토스트만 남는다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    provider.overlap.set(true);

    provider.info("첫 번째");
    await tick(fixture);
    expect(getToastsInBody().length).toBe(1);

    provider.info("두 번째");
    await tick(fixture);
    expect(getToastsInBody().length).toBe(1);

    const toast = getToastsInBody()[0];
    expect(toast.querySelector("._message")!.textContent).toContain("두 번째");
  });

  // Acceptance: 일반 토스트 자동 해제 (3초)
  it("일반 토스트는 3초 후 자동 해제된다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("자동 해제");
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // 3초 경과 → dismiss 시작 (open=false + fallback 300ms)
      vi.advanceTimersByTime(3000);
      flushSync(fixture);

      // transitionend 시뮬레이션
      const toast = getToastsInBody()[0];
      toast.dispatchEvent(new Event("transitionend"));
      flushSync(fixture);

      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Acceptance: 호버 중 해제 지연
  it("타이머 만료 후 마우스가 올려져 있으면 해제가 1초 지연된다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("호버 테스트");
      flushSync(fixture);

      const toast = getToastsInBody()[0];
      expect(toast).toBeDefined();

      // 마우스 올려놓기
      toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      // 3초 경과 — 마우스가 올려져 있으므로 dismissPending 상태
      vi.advanceTimersByTime(3000);
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // 마우스 떠남 → 1초 뒤 dismiss
      toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      vi.advanceTimersByTime(1000);
      flushSync(fixture);

      // transitionend
      if (getToastsInBody().length > 0) {
        getToastsInBody()[0].dispatchEvent(new Event("transitionend"));
      }
      flushSync(fixture);

      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Unit: alertThemes에 없는 심각도는 정상적으로 토스트가 생성된다
  it("alertThemes에 danger만 포함되어 있을 때 info는 토스트로 표시된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    provider.alertThemes.set(["danger"]);

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    provider.info("정보");
    await tick(fixture);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(getToastsInBody().length).toBe(1);
    alertSpy.mockRestore();
  });

  // Unit: overlap=false이면 기존 토스트가 유지된다
  it("overlap=false이면 새 토스트 표시 시 기존 토스트가 유지된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    provider.overlap.set(false);

    provider.info("첫 번째");
    await tick(fixture);
    provider.info("두 번째");
    await tick(fixture);

    expect(getToastsInBody().length).toBe(2);
  });

  // Unit: 컨테이너는 한 번만 생성된다
  it("여러 토스트를 표시해도 sd-toast-container는 하나만 생성된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);

    provider.info("첫 번째");
    provider.success("두 번째");
    await tick(fixture);

    const containers = document.body.querySelectorAll("sd-toast-container");
    expect(containers.length).toBe(1);
  });

  // Unit: 토스트의 theme이 올바르게 설정된다
  it("각 심각도별 토스트의 data-sd-theme이 올바르게 설정된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);

    provider.info("info");
    provider.warning("warning");
    await tick(fixture);

    const toasts = getToastsInBody();
    expect(toasts[0].getAttribute("data-sd-theme")).toBe("info");
    expect(toasts[1].getAttribute("data-sd-theme")).toBe("warning");
  });

  // Acceptance: 프로그래스 100% 후 자동 해제
  it("progress를 100으로 설정하면 1초 후 토스트가 자동 해제된다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      const progress = provider.info("업로드 중", true);
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // progress를 100으로 설정
      progress.set(100);
      flushSync(fixture);

      // 1초 후 자동 해제
      vi.advanceTimersByTime(1000);
      flushSync(fixture);

      // transitionend
      if (getToastsInBody().length > 0) {
        getToastsInBody()[0].dispatchEvent(new Event("transitionend"));
      }
      flushSync(fixture);

      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

// region Feature 3.2 Slice 3: 토스트 dismiss 중복 방지 + overlap 반응적 바인딩

describe("Feature 3.2 Slice 3: 토스트 auto-dismiss 중복 방지 (LOGIC-031)", () => {
  // Acceptance: hover/leave 반복 후에도 dismiss가 1회만 발생한다
  it("hover → leave → hover → leave 반복 후 dismiss가 1회만 발생한다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("반복 테스트");
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      const toast = getToastsInBody()[0];

      // 3초 타이머 만료 전에 hover/leave 반복
      toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      vi.advanceTimersByTime(3000); // hover 중이라 dismissPending
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // leave → 1초 dismiss 스케줄
      toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      // 즉시 다시 hover
      toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      vi.advanceTimersByTime(1000); // hover 중이라 다시 dismissPending
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // 최종 leave
      toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      vi.advanceTimersByTime(1000);
      flushSync(fixture);

      // transitionend
      if (getToastsInBody().length > 0) {
        getToastsInBody()[0].dispatchEvent(new Event("transitionend"));
      }
      flushSync(fixture);

      expect(getToastsInBody().length).toBe(0);

      // 추가 타이머가 있어도 에러 없이 처리
      vi.advanceTimersByTime(5000);
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Unit: dismiss 후 추가 dismissAfterDelay가 스케줄되어도 무시된다
  it("dismiss 후 추가 타이머가 실행되어도 중복 dismiss가 발생하지 않는다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("중복 방지");
      flushSync(fixture);

      const toast = getToastsInBody()[0];

      // hover
      toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      vi.advanceTimersByTime(3000); // dismissPending = true
      flushSync(fixture);

      // leave → dismiss 스케줄
      toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      // 다시 hover 후 leave (추가 dismissAfterDelay 스케줄)
      toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

      // 첫 번째 dismiss 실행
      vi.advanceTimersByTime(1000);
      flushSync(fixture);
      if (getToastsInBody().length > 0) {
        getToastsInBody()[0].dispatchEvent(new Event("transitionend"));
      }
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(0);

      // 두 번째 타이머가 실행되어도 에러 없음
      vi.advanceTimersByTime(1000);
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Feature 3.2 Slice 3: 토스트 overlap 반응적 바인딩 (LOGIC-032)", () => {
  // Acceptance: overlap 변경이 컨테이너에 반응적으로 반영된다
  it("overlap signal 변경 시 컨테이너의 overlap input이 즉시 갱신된다", async () => {
    const fixture = setupHost();
    const provider = TestBed.inject(SdToastProvider);
    provider.overlap.set(false);

    provider.info("첫 토스트");
    await tick(fixture);

    const container = document.body.querySelector("sd-toast-container") as HTMLElement;
    expect(container).not.toBeNull();
    // 초기 overlap=false
    expect(container.getAttribute("data-sd-overlap")).toBeNull();

    // overlap을 true로 변경 — effect가 반응적으로 갱신해야 한다
    provider.overlap.set(true);
    await tick(fixture);

    // 새 토스트를 표시하지 않아도 컨테이너의 overlap이 갱신되어야 한다
    expect(container.getAttribute("data-sd-overlap")).not.toBeNull();
  });
});

// endregion

// region FIX-2 Slice 3: toast dismiss 중복 방지 (DESIGN-003)

describe("FIX-2 Slice 3: toast dismiss 중복 방지 (DESIGN-003)", () => {
  it("transitionend와 setTimeout이 동시에 발생해도 한 번만 파괴된다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("테스트");
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // 3초 후 dismiss 시작
      vi.advanceTimersByTime(3000);
      flushSync(fixture);

      const toast = getToastsInBody()[0];
      expect(toast).toBeTruthy();

      // transitionend 발생 → 첫 번째 파괴
      toast.dispatchEvent(new Event("transitionend"));
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(0);

      // 300ms setTimeout 실행 → 두 번째 파괴 시도 (이미 파괴됨, 에러 없어야 함)
      vi.advanceTimersByTime(300);
      flushSync(fixture);
      // 에러 없이 완료되면 성공
      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("transitionend 없이 300ms setTimeout만으로도 파괴된다", () => {
    vi.useFakeTimers();
    try {
      const fixture = setupHost();
      const provider = TestBed.inject(SdToastProvider);

      provider.info("fallback 테스트");
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(1);

      // 3초 후 dismiss 시작
      vi.advanceTimersByTime(3000);
      flushSync(fixture);

      // transitionend 없이 300ms 경과
      vi.advanceTimersByTime(300);
      flushSync(fixture);
      expect(getToastsInBody().length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

// endregion
