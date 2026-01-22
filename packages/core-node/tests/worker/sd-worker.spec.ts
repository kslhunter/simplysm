import { afterEach, describe, expect, it } from "vitest";
import path from "path";
import type { SdWorkerProxy } from "../../src/worker/types";
import { SdWorker } from "../../src/worker/sd-worker";
import type * as TestWorkerModule from "./fixtures/test-worker";

describe("SdWorker", () => {
  const workerPath = path.resolve(import.meta.dirname, "fixtures/test-worker.ts");
  let worker: SdWorkerProxy<typeof TestWorkerModule> | undefined;

  afterEach(async () => {
    if (worker) {
      await worker.terminate();
      worker = undefined;
    }
  });

  //#region 메서드 호출

  describe("메서드 호출", () => {
    it("워커 메서드 호출 및 결과 반환", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.add(10, 20);

      expect(result).toBe(30);
    });

    it("문자열 반환 메서드 호출", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.echo("Hello");

      expect(result).toBe("Echo: Hello");
    });

    it("워커에서 에러 발생 시 reject", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      await expect(worker.throwError()).rejects.toThrow();
    });

    it("다중 요청 동시 처리", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

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
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      const result = await worker.noReturn();

      expect(result).toBeUndefined();
    });
  });

  //#endregion

  //#region 이벤트

  describe("이벤트", () => {
    it("워커에서 이벤트 수신", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      const events: number[] = [];
      worker.on("progress", (value) => {
        events.push(value);
      });

      await worker.add(1, 2);

      expect(events).toContain(50);
    });
  });

  //#endregion

  //#region terminate

  describe("terminate", () => {
    it("대기 중인 요청이 Worker terminated 에러와 함께 reject", async () => {
      worker = SdWorker.create<typeof TestWorkerModule>(workerPath);

      const runPromise = worker.delay(5000);

      // 워커 종료 전에 미리 에러를 캐치할 준비를 한다
      const errorPromise = runPromise.catch((err: unknown) => err);

      // 워커 종료
      await worker.terminate();
      worker = undefined;

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Worker terminated");
    });
  });

  //#endregion
});
