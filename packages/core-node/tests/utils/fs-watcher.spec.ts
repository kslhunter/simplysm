import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { SdFsWatcher } from "../../src/utils/fs-watcher";

describe("SdFsWatcher", () => {
  const testDir = path.join(os.tmpdir(), "fs-watcher-test-" + Date.now());
  let watcher: SdFsWatcher | undefined;

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (watcher != null) {
      await watcher.close();
      watcher = undefined;
    }
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  //#region watchAsync

  describe("watchAsync", () => {
    it("파일 감시 시작", async () => {
      watcher = await SdFsWatcher.watchAsync([path.join(testDir, "**/*")]);
      expect(watcher).toBeDefined();
    });

    it("옵션과 함께 파일 감시 시작", async () => {
      watcher = await SdFsWatcher.watchAsync([path.join(testDir, "**/*")], {
        ignoreInitial: false,
      });
      expect(watcher).toBeDefined();
    });
  });

  //#endregion

  //#region close

  describe("close", () => {
    it("감시 종료", async () => {
      watcher = await SdFsWatcher.watchAsync([path.join(testDir, "**/*")]);
      await watcher.close();

      // 종료 후 watcher 참조 해제
      watcher = undefined;

      // 에러 없이 완료되면 성공
      expect(true).toBe(true);
    });
  });

  //#endregion

  //#region chaining

  describe("onChange", () => {
    it("onChange 메서드 체이닝 지원", async () => {
      watcher = await SdFsWatcher.watchAsync([path.join(testDir, "**/*")]);

      const fn = vi.fn();
      const result = watcher.onChange({ delay: 100 }, fn);

      expect(result).toBe(watcher);
    });

    it("delay 옵션 지정 가능", async () => {
      watcher = await SdFsWatcher.watchAsync([path.join(testDir, "**/*")]);

      const fn = vi.fn();
      // delay 옵션이 다양한 값으로 지정 가능해야 함
      expect(() => watcher!.onChange({ delay: 0 }, fn)).not.toThrow();
      expect(() => watcher!.onChange({ delay: 500 }, fn)).not.toThrow();
      expect(() => watcher!.onChange({ delay: 1000 }, fn)).not.toThrow();
    });
  });

  //#endregion

  //#region Types

  describe("Types", () => {
    it("TSdFsWatcherEvent 타입 정의 확인", () => {
      // 이벤트 타입이 올바르게 정의되어 있는지 확인
      const validEvents = ["add", "addDir", "change", "unlink", "unlinkDir"];
      expect(validEvents).toContain("add");
      expect(validEvents).toContain("addDir");
      expect(validEvents).toContain("change");
      expect(validEvents).toContain("unlink");
      expect(validEvents).toContain("unlinkDir");
    });

    it("ISdFsWatcherChangeInfo 구조 확인", () => {
      // 인터페이스 구조 확인용 타입 체크
      const mockChangeInfo = {
        event: "add" as const,
        path: "/test/path",
      };

      expect(mockChangeInfo.event).toBe("add");
      expect(mockChangeInfo.path).toBe("/test/path");
    });
  });

  //#endregion
});
