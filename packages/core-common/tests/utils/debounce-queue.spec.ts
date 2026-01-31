import { describe, it, expect } from "vitest";
import { DebounceQueue, waitTime as time, SdError } from "@simplysm/core-common";

describe("DebounceQueue", () => {
  //#region 디바운스 동작

  describe("디바운스 동작", () => {
    it("마지막 요청만 실행한다", async () => {
      const queue = new DebounceQueue(50);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(() => {
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      // 디바운스 대기
      await time(100);

      // 마지막 요청만 실행됨
      expect(calls).toEqual([3]);
    });

    it("delay 이후에 실행한다", async () => {
      const queue = new DebounceQueue(100);
      const calls: number[] = [];

      const start = Date.now();
      queue.run(() => {
        calls.push(1);
      });

      // 50ms 후에는 아직 실행 안 됨
      await time(50);
      expect(calls).toEqual([]);

      // 100ms 후에는 실행됨
      await time(100);
      expect(calls).toEqual([1]);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it("delay가 없으면 즉시 실행한다", async () => {
      const queue = new DebounceQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // 약간의 대기 (이벤트 루프)
      await time(10);

      expect(calls).toEqual([1]);
    });

    it("실행 중에 새 요청이 들어오면 완료 후 실행한다", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
        await time(50); // 실행 중 대기
      });

      // 첫 실행 시작 대기
      await time(20);

      // 실행 중에 새 요청 추가
      queue.run(() => {
        calls.push(2);
      });

      // 모든 작업 완료 대기
      await time(100);

      expect(calls).toEqual([1, 2]);
    });
  });

  //#endregion

  //#region 에러 처리

  describe("에러 처리", () => {
    it("에러 발생 시 error 이벤트를 발생시킨다", async () => {
      const queue = new DebounceQueue(10);
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        throw new Error("test error");
      });

      await time(50);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SdError);
      expect(errors[0].message).toContain("작업 실행 중 오류 발생");
      expect(errors[0].message).toContain("test error");
    });

    it("에러가 발생해도 다음 요청은 정상 실행된다", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];
      const errors: SdError[] = [];

      // 에러 리스너 추가하여 unhandled rejection 방지
      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(() => {
        throw new Error("error");
      });

      await time(50);

      queue.run(() => {
        calls.push(1);
      });

      await time(50);

      expect(calls).toEqual([1]);
      expect(errors).toHaveLength(1);
    });

    it("실행 중 에러가 발생해도 pendingFn은 실행된다", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      // 첫 요청: 에러 발생
      queue.run(() => {
        calls.push(1);
        throw new Error("error 1");
      });

      await time(20);

      // 실행 중 새 요청 추가
      queue.run(() => {
        calls.push(2);
      });

      await time(100);

      expect(calls).toEqual([1, 2]);
      expect(errors).toHaveLength(1);
    });
  });

  //#endregion

  //#region dispose

  describe("dispose()", () => {
    it("대기 중인 작업과 타이머를 정리한다", async () => {
      const queue = new DebounceQueue(100);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      // 디바운스 대기 중 dispose
      await time(50);
      queue.dispose();

      // 디바운스 시간 경과 후에도 실행 안 됨
      await time(100);

      expect(calls).toEqual([]);
    });

    it("dispose 후 새 작업은 무시된다", async () => {
      const queue = new DebounceQueue(50);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.dispose();

      // dispose 후 새 작업 추가 - 무시됨
      queue.run(() => {
        calls.push(2);
      });

      await time(100);

      // dispose 후 새 작업은 실행되지 않음
      expect(calls).toEqual([]);
    });

    it("여러 번 호출해도 안전하다", () => {
      const queue = new DebounceQueue(50);

      // 여러 번 호출해도 에러 없음
      queue.dispose();
      queue.dispose();
      queue.dispose();
    });

    it("using 문으로 자동 dispose된다", async () => {
      const calls: number[] = [];
      {
        using queue = new DebounceQueue(100);
        queue.run(() => {
          calls.push(1);
        });
        await time(50);
      } // using 블록 종료 시 dispose 자동 호출
      await time(100);
      // 디바운스 대기 중 dispose되어 실행 안 됨
      expect(calls).toEqual([]);
    });
  });

  //#endregion

  //#region 동기 함수 지원

  describe("동기 함수 지원", () => {
    it("동기 함수도 실행할 수 있다", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });

      await time(50);

      expect(calls).toEqual([1]);
    });

    it("동기/비동기 함수를 혼합해서 사용할 수 있다", async () => {
      const queue = new DebounceQueue(10);
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(async () => {
        await time(10);
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      await time(100);

      // 마지막 요청만 실행
      expect(calls).toEqual([3]);
    });
  });

  //#endregion
});
