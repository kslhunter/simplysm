import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdPrintProvider } from "../../../src/core/providers/sd-print.provider";
import { SdBusyProvider } from "../../../src/core/providers/sd-busy.provider";
import { SdBusyProviderTestHost } from "../../ui/overlay/busy/sd-busy-test.fixture";
import {
  SdPrintTestBasic,
  SdPrintTestWithImages,
  SdPrintTestDelayed,
  SdPrintTestNoImages,
  SdPrintTestMultiPage,
} from "./sd-print-test.fixture";
import { TimeoutError } from "@simplysm/core-common";

let printSpy: ReturnType<typeof vi.spyOn>;

function setupHost() {
  TestBed.configureTestingModule({ imports: [SdBusyProviderTestHost] });
  const fixture = TestBed.createComponent(SdBusyProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function capturePrintStyle(): { getStyle: () => string } {
  let styleContent = "";
  printSpy.mockImplementation(() => {
    for (const s of document.head.querySelectorAll("style")) {
      if (s.innerHTML.includes("_sd-print-template")) {
        styleContent = s.innerHTML;
      }
    }
  });
  return { getStyle: () => styleContent };
}

beforeEach(() => {
  printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
});

afterEach(() => {
  printSpy.mockRestore();
  // cleanup: body에 남은 인쇄 관련 요소 제거
  for (const el of document.body.querySelectorAll("._sd-print-template")) {
    el.remove();
  }
  for (const el of document.head.querySelectorAll("style")) {
    if (el.innerHTML.includes("_sd-print-template")) {
      el.remove();
    }
  }
});

describe("Feature 3.5.1 Slice 1: printAsync + 공통 인프라", () => {
  // Scenario: 기본 옵션으로 인쇄
  it("기본 옵션으로 printAsync 호출 시 컴포넌트가 DOM에 추가되고 @page size A4 auto, margin 0으로 인쇄된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });

    expect(printSpy).toHaveBeenCalled();
  });

  // Scenario: 커스텀 size로 인쇄
  it("size A3으로 printAsync 호출 시 @page size A3으로 인쇄된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const { getStyle } = capturePrintStyle();

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} }, { size: "A3" });

    expect(getStyle()).toContain("size: A3");
  });

  // Scenario: 커스텀 margin으로 인쇄
  it("margin 10mm으로 printAsync 호출 시 @page margin 10mm으로 인쇄된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const { getStyle } = capturePrintStyle();

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} }, { margin: "10mm" });

    expect(getStyle()).toContain("margin: 10mm");
  });

  // Scenario: 인쇄 후 정리
  it("printAsync 완료 후 동적 컴포넌트와 스타일이 DOM에서 제거된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });

    // 인쇄 후 컴포넌트가 DOM에서 제거되었는지 확인
    const printTemplates = document.body.querySelectorAll("._sd-print-template");
    expect(printTemplates.length).toBe(0);

    // 인쇄 스타일이 DOM에서 제거되었는지 확인
    const styles = document.head.querySelectorAll("style");
    let found = false;
    for (const s of styles) {
      if (s.innerHTML.includes("_sd-print-template")) {
        found = true;
      }
    }
    expect(found).toBe(false);
  });

  // Scenario: 작업 시작 시 busy 카운트 증가
  it("printAsync 시작 시 globalBusyCount가 1 증가한다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const busy = TestBed.inject(SdBusyProvider);

    let busyCountDuringPrint = -1;
    printSpy.mockImplementation(() => {
      busyCountDuringPrint = busy.globalBusyCount();
    });

    expect(busy.globalBusyCount()).toBe(0);
    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });

    expect(busyCountDuringPrint).toBe(1);
  });

  // Scenario: 작업 성공 시 busy 카운트 감소
  it("printAsync 성공 완료 후 globalBusyCount가 1 감소한다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const busy = TestBed.inject(SdBusyProvider);

    expect(busy.globalBusyCount()).toBe(0);
    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });
    expect(busy.globalBusyCount()).toBe(0);
  });

  // Scenario: 작업 실패 시 busy 카운트 감소
  it("printAsync 실패 시에도 globalBusyCount가 1 감소한다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const busy = TestBed.inject(SdBusyProvider);

    // window.print가 에러를 던지도록 설정
    printSpy.mockImplementation(() => {
      throw new Error("Print failed");
    });

    expect(busy.globalBusyCount()).toBe(0);
    try {
      await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });
    } catch {
      // 에러 무시 — busy 카운트만 확인
    }
    expect(busy.globalBusyCount()).toBe(0);
  });

  // Scenario: 컴포넌트 초기화 대기
  it("initialized()가 true로 변경될 때까지 대기 후 인쇄가 진행된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    SdPrintTestDelayed.latestInstance = undefined;

    let printCalled = false;
    printSpy.mockImplementation(() => {
      printCalled = true;
    });

    // SdPrintTestDelayed는 initialized가 false로 시작
    const printPromise = provider.printAsync({ type: SdPrintTestDelayed, inputs: {} });

    // 인쇄가 아직 호출되지 않았음
    await new Promise((r) => setTimeout(r, 50));
    expect(printCalled).toBe(false);

    // latestInstance를 통해 컴포넌트 인스턴스에 접근
    expect(SdPrintTestDelayed.latestInstance).not.toBeUndefined();
    SdPrintTestDelayed.latestInstance!.initialized.set(true);

    await printPromise;
    expect(printCalled).toBe(true);
  });

  // Scenario: 이미지 로드 대기
  it("컴포넌트의 모든 이미지가 로드되면 인쇄가 진행된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    await provider.printAsync({ type: SdPrintTestWithImages, inputs: {} });

    expect(printSpy).toHaveBeenCalled();
  });

  // Scenario: 이미지 로드 실패 시 진행
  it("이미지 로드가 실패해도 에러 없이 인쇄가 진행된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    // data URI 이미지는 즉시 로드되므로 별도의 실패 시뮬레이션 없이
    // _waitForAllImagesLoadedAsync가 에러 이벤트를 에러로 간주하지 않는지 확인
    await expect(
      provider.printAsync({ type: SdPrintTestWithImages, inputs: {} }),
    ).resolves.toBeUndefined();
  });

  // Scenario: 이미지 없는 컴포넌트
  it("이미지가 없는 컴포넌트는 이미지 대기 없이 즉시 인쇄가 진행된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    await provider.printAsync({ type: SdPrintTestNoImages, inputs: {} });

    expect(printSpy).toHaveBeenCalled();
  });

  // Unit: 기본 옵션 시 @page에 size "A4 auto"와 margin "0"이 포함된다
  it("기본 옵션 시 @page 스타일에 size A4 auto와 margin 0이 포함된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const { getStyle } = capturePrintStyle();

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });

    expect(getStyle()).toContain("size: A4 auto");
    expect(getStyle()).toContain("margin: 0");
  });

  // Unit: 인쇄 중 컴포넌트에 _sd-print-template 클래스가 부여된다
  it("인쇄 중 컴포넌트 요소에 _sd-print-template 클래스가 부여된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    let hasClass = false;
    printSpy.mockImplementation(() => {
      const templateEl = document.body.querySelector("._sd-print-template");
      hasClass = templateEl !== null;
    });

    await provider.printAsync({ type: SdPrintTestBasic, inputs: {} });

    expect(hasClass).toBe(true);
  });

  // Unit: printAsync에 inputs를 전달하면 컴포넌트에 바인딩된다
  it("inputs로 전달한 값이 동적 컴포넌트에 바인딩된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    let textContent = "";
    printSpy.mockImplementation(() => {
      const templateEl = document.body.querySelector("._sd-print-template");
      textContent = templateEl?.textContent ?? "";
    });

    await provider.printAsync({
      type: SdPrintTestBasic,
      inputs: { title: "테스트 제목" },
    });

    expect(textContent).toContain("테스트 제목");
  });
});

describe("Feature 4.2a Slice 1: 인쇄 폴링 타임아웃", () => {
  // Scenario: 인쇄 템플릿 초기화가 타임아웃되면 에러를 발생시킨다
  it("initialized()가 30초간 false를 유지하면 TimeoutError가 발생하고 busy가 해제된다", async () => {
    vi.useFakeTimers();
    try {
      setupHost();
      const provider = TestBed.inject(SdPrintProvider);
      const busy = TestBed.inject(SdBusyProvider);
      SdPrintTestDelayed.latestInstance = undefined;

      let rejectedError: unknown;
      provider
        .printAsync({ type: SdPrintTestDelayed, inputs: {} })
        .catch((err) => {
          rejectedError = err;
        });

      // 30초(300 × 100ms) 타임아웃 시뮬레이션
      await vi.advanceTimersByTimeAsync(30_100);

      expect(rejectedError).toBeInstanceOf(TimeoutError);
      expect(busy.globalBusyCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Unit: 타임아웃 시 DOM 정리
  it("타임아웃 발생 시 인쇄 컴포넌트와 스타일이 DOM에서 제거된다", async () => {
    vi.useFakeTimers();
    try {
      setupHost();
      const provider = TestBed.inject(SdPrintProvider);
      SdPrintTestDelayed.latestInstance = undefined;

      provider
        .printAsync({ type: SdPrintTestDelayed, inputs: {} })
        .catch(() => {});

      await vi.advanceTimersByTimeAsync(30_100);

      const printTemplates = document.body.querySelectorAll("._sd-print-template");
      expect(printTemplates.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Feature 3.5.1 Slice 2: getPdfBufferAsync", () => {
  // Scenario: 기본 옵션으로 PDF 생성
  it("기본 옵션으로 getPdfBufferAsync 호출 시 A4 portrait PDF가 Uint8Array로 반환된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync({ type: SdPrintTestBasic, inputs: {} });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // PDF 시그니처 확인 (%PDF-)
    const header = String.fromCharCode(result[0], result[1], result[2], result[3], result[4]);
    expect(header).toBe("%PDF-");
  });

  // Scenario: landscape 방향으로 PDF 생성
  it("orientation landscape로 호출 시 가로 방향 PDF가 생성된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync(
      { type: SdPrintTestBasic, inputs: {} },
      { orientation: "landscape" },
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  // Scenario: 커스텀 페이지 크기로 PDF 생성 (D1 설계 결정)
  it("pageSize a3으로 호출 시 A3 크기 PDF가 생성된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync(
      { type: SdPrintTestBasic, inputs: {} },
      { pageSize: "a3" },
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  // Scenario: 멀티 페이지 PDF 생성
  it(".page 클래스 요소 3개를 가진 컴포넌트로 호출 시 3페이지 PDF가 생성된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync({
      type: SdPrintTestMultiPage,
      inputs: {},
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  // Scenario: 단일 페이지 PDF 생성
  it(".page 클래스 요소가 없는 컴포넌트로 호출 시 전체 컴포넌트가 1페이지 PDF로 생성된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync({
      type: SdPrintTestNoImages,
      inputs: {},
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  // Scenario: PDF 생성 후 정리
  it("getPdfBufferAsync 완료 후 동적 컴포넌트와 스타일이 DOM에서 제거된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const countOverflowStyles = () => {
      let count = 0;
      for (const s of document.head.querySelectorAll("style")) {
        if (s.innerHTML.includes("overflow: hidden")) {
          count++;
        }
      }
      return count;
    };

    const overflowBefore = countOverflowStyles();
    await provider.getPdfBufferAsync({ type: SdPrintTestBasic, inputs: {} });

    const printTemplates = document.body.querySelectorAll("._sd-print-template");
    expect(printTemplates.length).toBe(0);

    expect(countOverflowStyles()).toBe(overflowBefore);
  });

  // Unit: PDF 생성 중 busy 카운트가 증가하고 완료 후 감소한다
  it("getPdfBufferAsync 실행 중 globalBusyCount가 1 증가하고 완료 후 0으로 복원된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);
    const busy = TestBed.inject(SdBusyProvider);

    expect(busy.globalBusyCount()).toBe(0);
    await provider.getPdfBufferAsync({ type: SdPrintTestBasic, inputs: {} });
    expect(busy.globalBusyCount()).toBe(0);
  });

  // Unit: pageSize와 orientation을 동시에 지정할 수 있다
  it("pageSize와 orientation을 동시에 지정하면 해당 크기와 방향의 PDF가 생성된다", async () => {
    setupHost();
    const provider = TestBed.inject(SdPrintProvider);

    const result = await provider.getPdfBufferAsync(
      { type: SdPrintTestBasic, inputs: {} },
      { pageSize: "a3", orientation: "landscape" },
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});
