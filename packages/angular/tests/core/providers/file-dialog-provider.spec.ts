import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdFileDialogProvider } from "../../../src/core/providers/sd-file-dialog.provider";

describe("Feature 1.9 Slice 1: 파일 다이얼로그 + 로컬 스토리지", () => {
  describe("Rule: 파일 선택 다이얼로그로 파일을 선택한다", () => {
    let provider: SdFileDialogProvider;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      provider = TestBed.inject(SdFileDialogProvider);
    });

    afterEach(() => {
      // 테스트에서 남긴 input 요소 정리
      document.querySelectorAll('input[type="file"]').forEach((el) => el.remove());
    });

    it("showAsync() 호출 후 파일 1개 선택하면 File 객체가 반환된다", async () => {
      const mockFile = new File(["content"], "test.txt", { type: "text/plain" });

      const promise = provider.showAsync();

      // showAsync()가 DOM에 추가한 hidden input을 찾는다
      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.multiple).toBe(false);

      // 파일 선택 시뮬레이션
      const dt = new DataTransfer();
      dt.items.add(mockFile);
      Object.defineProperty(input, "files", { value: dt.files, configurable: true });
      input.dispatchEvent(new Event("change"));

      const result = await promise;
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("test.txt");
    });

    it("showAsync(true) 호출 후 파일 여러 개 선택하면 File[] 배열이 반환된다", async () => {
      const file1 = new File(["a"], "a.txt", { type: "text/plain" });
      const file2 = new File(["b"], "b.txt", { type: "text/plain" });

      const promise = provider.showAsync(true);

      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.multiple).toBe(true);

      const dt = new DataTransfer();
      dt.items.add(file1);
      dt.items.add(file2);
      Object.defineProperty(input, "files", { value: dt.files, configurable: true });
      input.dispatchEvent(new Event("change"));

      const result = await promise;
      expect(result).toHaveLength(2);
    });

    it("accept 필터를 지정하면 input의 accept 속성에 반영된다", async () => {
      const mockFile = new File(["data"], "data.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const promise = provider.showAsync(false, ".xlsx,.csv");

      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.accept).toBe(".xlsx,.csv");

      const dt = new DataTransfer();
      dt.items.add(mockFile);
      Object.defineProperty(input, "files", { value: dt.files, configurable: true });
      input.dispatchEvent(new Event("change"));

      await promise;
    });

    it("사용자가 다이얼로그를 취소하면 undefined가 반환된다", async () => {
      const promise = provider.showAsync();

      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // setTimeout 콜백이 onfocus를 등록하도록 틱 진행
      await new Promise((resolve) => setTimeout(resolve, 0));

      // focus 이벤트로 취소 감지 트리거
      input.dispatchEvent(new Event("focus"));

      // Wait.time(1000) 대기 후 resolve(undefined)
      const result = await promise;
      expect(result).toBeUndefined();
    }, 5000);
  });
});

describe("Feature 4.2a Slice 3: 파일 다이얼로그 cancel 개선", () => {
  let provider: SdFileDialogProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdFileDialogProvider);
  });

  afterEach(() => {
    document.querySelectorAll('input[type="file"]').forEach((el) => el.remove());
  });

  // Scenario: cancel 이벤트를 지원하는 브라우저에서 취소한다
  it("cancel 이벤트 발생 시 undefined가 반환되고 input이 제거된다", async () => {
    const promise = provider.showAsync();

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    // cancel 이벤트 발생
    input.dispatchEvent(new Event("cancel", { bubbles: false, cancelable: false }));

    // 이벤트 처리 대기
    await new Promise((r) => setTimeout(r, 0));

    const result = await Promise.race([promise, Promise.resolve("__timeout__" as unknown)]);
    expect(result).not.toBe("__timeout__");
    expect(result).toBeUndefined();

    // input이 DOM에서 제거되었는지 확인
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });

  // Scenario: 느린 기기에서 change 이벤트가 focus 후 지연 도착한다
  it("focus 이벤트 후 1초 이내에 change가 도착하면 파일을 반환한다", async () => {
    vi.useFakeTimers();
    try {
      const mockFile = new File(["content"], "slow.txt", { type: "text/plain" });
      const promise = provider.showAsync();

      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();

      // setTimeout 콜백이 onfocus를 등록하도록 틱 진행
      await vi.advanceTimersByTimeAsync(0);

      // focus 이벤트 → 1초 타이머 시작
      input.dispatchEvent(new Event("focus"));

      // 500ms 후 change 이벤트 도착 (1초 이내)
      await vi.advanceTimersByTimeAsync(500);
      const dt = new DataTransfer();
      dt.items.add(mockFile);
      Object.defineProperty(input, "files", { value: dt.files, configurable: true });
      input.dispatchEvent(new Event("change"));

      const result = await promise;
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("slow.txt");
    } finally {
      vi.useRealTimers();
    }
  });
});
