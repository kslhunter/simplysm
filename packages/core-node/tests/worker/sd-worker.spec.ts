import { afterEach, describe, expect, it } from "vitest";
import path from "path";
import type { WorkerProxy } from "../../src/worker/types";
import { Worker } from "../../src/worker/worker";
import type * as TestWorkerModule from "./fixtures/test-worker";

describe("SdWorker", () => {
  const workerPath = path.resolve(import.meta.dirname, "fixtures/test-worker.ts");
  let worker: WorkerProxy<typeof TestWorkerModule> | undefined;

  afterEach(async () => {
    if (worker) {
      await worker.terminate();
      worker = undefined;
    }
  });

  //#region 메서드 호출

  describe("메서드 호출", () => {
    it("워커 메서드 호출 및 결과 반환", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.add(10, 20);

      expect(result).toBe(30);
    });

    it("문자열 반환 메서드 호출", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.echo("Hello");

      expect(result).toBe("Echo: Hello");
    });

    it("워커에서 에러 발생 시 reject", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      await expect(worker.throwError()).rejects.toThrow();
    });

    it("존재하지 않는 메서드 호출 시 에러", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      // 타입 시스템을 우회하여 존재하지 않는 메서드 호출
      const unknownWorker = worker as unknown as { unknownMethod: () => Promise<void> };

      await expect(unknownWorker.unknownMethod()).rejects.toThrow(
        "알 수 없는 메서드: unknownMethod",
      );
    });

    it("다중 요청 동시 처리", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const [result1, result2, result3] = await Promise.all([
        worker.add(1, 2),
        worker.add(3, 4),
        worker.add(5, 6),
      ]);

      expect(result1).toBe(3);
      expect(result2).toBe(7);
      expect(result3).toBe(11);
    });

    it("void 반환 메서드 호출", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.noReturn();

      expect(result).toBeUndefined();
    });
  });

  //#endregion

  //#region 이벤트

  describe("이벤트", () => {
    it("워커에서 이벤트 수신", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const events: number[] = [];
      worker.on("progress", (value) => {
        events.push(value);
      });

      await worker.add(1, 2);

      expect(events).toContain(50);
    });

    it("off()로 이벤트 리스너 제거", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const events: number[] = [];
      const listener = (value: number) => {
        events.push(value);
      };

      worker.on("progress", listener);
      await worker.add(1, 2);

      // 리스너 제거
      worker.off("progress", listener);
      await worker.add(3, 4);

      // 첫 번째 호출의 이벤트만 수신되어야 함
      expect(events).toHaveLength(1);
      expect(events[0]).toBe(50);
    });
  });

  //#endregion

  //#region terminate

  describe("terminate", () => {
    it("대기 중인 요청이 Worker terminated 에러와 함께 reject", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const runPromise = worker.delay(5000);

      // 워커 종료 전에 미리 에러를 캐치할 준비를 한다
      const errorPromise = runPromise.catch((err: unknown) => err);

      // 워커 종료
      await worker.terminate();
      worker = undefined;

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("워커가 종료됨 (method: delay)");
    });

    it("워커 비정상 종료 시 대기 중인 요청 reject", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      // 긴 delay를 먼저 호출하여 pending 상태로 만듦
      const delayPromise = worker.delay(5000).catch((err: unknown) => err);

      // 짧은 대기 후 crash 호출 (delay가 pending 상태인 동안)
      await new Promise((resolve) => setTimeout(resolve, 10));
      await worker.crash();

      // 워커가 비정상 종료되면 pending 상태의 delay 요청이 reject되어야 함
      const error = await delayPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("워커가 비정상 종료됨");
    });
  });

  //#endregion

  //#region stdout/stderr

  describe("stdout/stderr", () => {
    it("워커의 console.log 출력이 메인 프로세스로 전달", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.logMessage("test message");

      // 메서드가 정상 반환되면 stdout 파이핑이 동작한 것
      expect(result).toBe("logged");
    });
  });

  //#endregion

  //#region env 옵션

  describe("env 옵션", () => {
    it("env 옵션이 워커에 전달", async () => {
      worker = Worker.create<typeof TestWorkerModule>(workerPath, {
        env: {
          TEST_ENV_VAR: "test-value-123",
        },
      });

      const result = await worker.getEnv("TEST_ENV_VAR");

      expect(result).toBe("test-value-123");
    });
  });

  //#endregion
});
