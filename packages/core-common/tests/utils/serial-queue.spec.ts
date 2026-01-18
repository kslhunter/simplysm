import { describe, it, expect } from "vitest";
import { SerialQueue, Wait, SdError } from "@simplysm/core-common";

describe("SerialQueue", () => {
  //#region 순차 실행

  describe("순차 실행", () => {
    it("큐에 추가된 함수들을 순서대로 실행한다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
      });
      queue.run(async () => {
        calls.push(2);
      });
      queue.run(async () => {
        calls.push(3);
      });

      await Wait.time(50);

      expect(calls).toEqual([1, 2, 3]);
    });

    it("이전 작업이 완료된 후 다음 작업을 실행한다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const timestamps: number[] = [];

      queue.run(async () => {
        timestamps.push(Date.now());
        calls.push(1);
        await Wait.time(50);
      });
      queue.run(async () => {
        timestamps.push(Date.now());
        calls.push(2);
        await Wait.time(50);
      });

      await Wait.time(200);

      expect(calls).toEqual([1, 2]);
      // 두 번째 작업은 첫 작업 완료 후 시작 (50ms 이상 차이)
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(50);
    });

    it("실행 중에 추가된 작업도 순차적으로 실행한다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
        await Wait.time(50);
      });

      // 첫 작업 시작 대기
      await Wait.time(10);

      // 실행 중에 추가
      queue.run(async () => {
        calls.push(2);
      });

      await Wait.time(100);

      expect(calls).toEqual([1, 2]);
    });
  });

  //#endregion

  //#region gap 간격

  describe("gap 간격", () => {
    it("gap이 설정되면 작업 사이에 대기한다", async () => {
      const queue = new SerialQueue(50);
      const timestamps: number[] = [];

      queue.run(async () => {
        timestamps.push(Date.now());
      });
      queue.run(async () => {
        timestamps.push(Date.now());
      });

      await Wait.time(150);

      expect(timestamps).toHaveLength(2);
      // 두 작업 사이에 최소 50ms 간격
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(50);
    });

    it("gap이 0이면 즉시 다음 작업을 실행한다", async () => {
      const queue = new SerialQueue(0);
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      await Wait.time(50);

      expect(timestamps).toHaveLength(2);
      // 간격이 매우 짧음 (10ms 미만)
      expect(timestamps[1] - timestamps[0]).toBeLessThan(10);
    });

    it("gap은 기본값 0이다", async () => {
      const queue = new SerialQueue();
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      await Wait.time(50);

      expect(timestamps).toHaveLength(2);
      expect(timestamps[1] - timestamps[0]).toBeLessThan(10);
    });

    it("마지막 작업 후에는 gap을 대기하지 않는다", async () => {
      const queue = new SerialQueue(100);
      const timestamps: number[] = [];

      queue.run(() => {
        timestamps.push(Date.now());
      });
      queue.run(() => {
        timestamps.push(Date.now());
      });

      // 충분히 대기 (작업1 + gap100 + 작업2 + 여유)
      await Wait.time(200);

      // gap이 실제로 적용되었는지 확인
      expect(timestamps).toHaveLength(2);
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(100);
    });
  });

  //#endregion

  //#region 에러 처리

  describe("에러 처리", () => {
    it("에러 발생 시 error 이벤트를 발생시킨다", async () => {
      const queue = new SerialQueue();
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(async () => {
        throw new Error("test error");
      });

      await Wait.time(50);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SdError);
      expect(errors[0].message).toContain("큐 작업 실행 중 오류 발생");
      expect(errors[0].message).toContain("test error");
    });

    it("에러가 발생해도 다음 작업은 계속 실행한다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const errors: SdError[] = [];

      // 에러 리스너 추가하여 unhandled rejection 방지
      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(async () => {
        calls.push(1);
        throw new Error("error");
      });
      queue.run(async () => {
        calls.push(2);
      });
      queue.run(async () => {
        calls.push(3);
      });

      await Wait.time(100);

      expect(calls).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(1);
    });

    it("여러 작업에서 에러가 발생해도 모두 실행한다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];
      const errors: SdError[] = [];

      queue.on("error", (err) => {
        errors.push(err);
      });

      queue.run(async () => {
        calls.push(1);
        throw new Error("error 1");
      });
      queue.run(async () => {
        calls.push(2);
      });
      queue.run(async () => {
        calls.push(3);
        throw new Error("error 3");
      });

      await Wait.time(100);

      expect(calls).toEqual([1, 2, 3]);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain("error 1");
      expect(errors[1].message).toContain("error 3");
    });
  });

  //#endregion

  //#region dispose

  describe("dispose()", () => {
    it("대기 중인 큐를 비운다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      // 첫 작업 실행 중
      queue.run(async () => {
        calls.push(1);
        await Wait.time(100);
      });

      // 대기 중인 작업들 추가
      queue.run(async () => {
        calls.push(2);
      });
      queue.run(async () => {
        calls.push(3);
      });

      // 첫 작업 시작 후 dispose
      await Wait.time(20);
      queue.dispose();

      // 모든 작업 완료 대기
      await Wait.time(150);

      // 첫 작업만 실행됨 (실행 중인 작업은 완료됨)
      expect(calls).toEqual([1]);
    });

    it("dispose 후 새 작업은 정상 실행된다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(async () => {
        calls.push(1);
      });
      queue.dispose();

      // dispose 후 새 작업 추가
      queue.run(async () => {
        calls.push(2);
      });

      await Wait.time(50);

      expect(calls).toContain(2);
    });

    it("여러 번 호출해도 안전하다", () => {
      const queue = new SerialQueue();

      // 여러 번 호출해도 에러 없음
      queue.dispose();
      queue.dispose();
      queue.dispose();
    });
  });

  //#endregion

  //#region 동기 함수 지원

  describe("동기 함수 지원", () => {
    it("동기 함수도 실행할 수 있다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(() => {
        calls.push(2);
      });

      await Wait.time(50);

      expect(calls).toEqual([1, 2]);
    });

    it("동기/비동기 함수를 혼합해서 사용할 수 있다", async () => {
      const queue = new SerialQueue();
      const calls: number[] = [];

      queue.run(() => {
        calls.push(1);
      });
      queue.run(async () => {
        await Wait.time(10);
        calls.push(2);
      });
      queue.run(() => {
        calls.push(3);
      });

      await Wait.time(100);

      expect(calls).toEqual([1, 2, 3]);
    });
  });

  //#endregion
});
