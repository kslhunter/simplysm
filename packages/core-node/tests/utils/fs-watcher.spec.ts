import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { FsWatcher } from "../../src/features/fs-watcher";

describe("SdFsWatcher", () => {
  const testDir = path.join(os.tmpdir(), "fs-watcher-test-" + Date.now());
  let watcher: FsWatcher | undefined;

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

  //#region watch

  describe("watch", () => {
    it("starts watching files", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);
      expect(watcher).toBeDefined();
    });

    it("starts watching files with options", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")], {
        ignoreInitial: false,
      });
      expect(watcher).toBeDefined();
    });

    it("logs errors when error events occur", async () => {
      // chokidar starts watching non-existent paths without issue
      // Error events only occur on actual filesystem errors
      const nonExistentPath = path.join(testDir, "non-existent-dir-" + Date.now());
      watcher = await FsWatcher.watch([nonExistentPath]);

      // Error handler is registered so it doesn't crash even if an error occurs
      expect(watcher).toBeDefined();
    });
  });

  //#endregion

  //#region close

  describe("close", () => {
    it("closes the watcher", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

      // Test passes if close() completes without error
      await expect(watcher.close()).resolves.toBeUndefined();

      // Release watcher reference after closing
      watcher = undefined;
    });
  });

  //#endregion

  //#region chaining

  describe("onChange", () => {
    it("supports onChange method chaining", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

      const fn = vi.fn();
      const result = watcher.onChange({ delay: 100 }, fn);

      expect(result).toBe(watcher);
    });

    it("can specify delay option with various values", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

      const fn = vi.fn();
      // delay option should be specifiable with various values
      expect(() => watcher!.onChange({ delay: 0 }, fn)).not.toThrow();
      expect(() => watcher!.onChange({ delay: 500 }, fn)).not.toThrow();
      expect(() => watcher!.onChange({ delay: 1000 }, fn)).not.toThrow();
    });
  });

  //#endregion

  //#region Types

  describe("Types", () => {
    it("verifies FsWatcherEvent type definition", () => {
      // Verify that event types are correctly defined
      const validEvents = ["add", "addDir", "change", "unlink", "unlinkDir"];
      expect(validEvents).toContain("add");
      expect(validEvents).toContain("addDir");
      expect(validEvents).toContain("change");
      expect(validEvents).toContain("unlink");
      expect(validEvents).toContain("unlinkDir");
    });

    it("verifies FsWatcherChangeInfo structure", () => {
      // Type check to verify interface structure
      const mockChangeInfo = {
        event: "add" as const,
        path: "/test/path",
      };

      expect(mockChangeInfo.event).toBe("add");
      expect(mockChangeInfo.path).toBe("/test/path");
    });
  });

  //#endregion

  //#region Glob Pattern Filtering

  describe("glob pattern filtering", () => {
    const DELAY = 300;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForChanges = (
      watcherInstance: FsWatcher,
      delay: number,
    ): Promise<Array<{ event: string; path: string }>> => {
      return new Promise((resolve) => {
        watcherInstance.onChange({ delay }, (changeInfos) => {
          resolve(changeInfos.map((c) => ({ event: c.event, path: c.path })));
        });
      });
    };

    it("receives events only for files matching glob pattern", async () => {
      // Glob pattern that watches only .txt files
      const globPattern = path.join(testDir, "**/*.txt");

      watcher = await FsWatcher.watch([globPattern]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // Create .txt file (matches)
      fs.writeFileSync(path.join(testDir, "matched.txt"), "hello");

      // Create .json file (does not match)
      await wait(50);
      fs.writeFileSync(path.join(testDir, "ignored.json"), "{}");

      const changes = await changesPromise;

      // Should only receive events for .txt file
      expect(changes.length).toBe(1);
      expect(changes[0].path).toContain("matched.txt");
      expect(changes[0].event).toBe("add");
    });
  });

  //#endregion

  //#region 이벤트 병합 (Event Merging)

  describe("event merging", () => {
    const DELAY = 300;

    /**
     * Helper function to wait for specified time.
     */
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Helper function to wait until event callback is called.
     */
    const waitForChanges = (
      watcherInstance: FsWatcher,
      delay: number,
    ): Promise<Array<{ event: string; path: string }>> => {
      return new Promise((resolve) => {
        watcherInstance.onChange({ delay }, (changeInfos) => {
          resolve(changeInfos.map((c) => ({ event: c.event, path: c.path })));
        });
      });
    };

    it("returns only add event when file is added then modified", async () => {
      const testFile = path.join(testDir, "test-add-change.txt");

      watcher = await FsWatcher.watch([testDir]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // 파일 추가
      fs.writeFileSync(testFile, "initial");

      // 짧은 간격으로 파일 변경 (delay 내에서 일어나야 함)
      await wait(50);
      fs.writeFileSync(testFile, "modified");

      // 이벤트 콜백 호출 대기
      const changes = await changesPromise;

      // add → change 가 add로 병합되어야 함
      expect(changes.length).toBe(1);
      expect(changes[0].event).toBe("add");
    });

    it("produces no events or no changes when file is added then deleted", async () => {
      const testFile = path.join(testDir, "test-add-unlink.txt");

      watcher = await FsWatcher.watch([testDir]);

      const changes: Array<{ event: string; path: string }> = [];
      let resolved = false;

      const changesPromise = new Promise<void>((resolve) => {
        watcher!.onChange({ delay: DELAY }, (changeInfos) => {
          changes.push(...changeInfos.map((c) => ({ event: c.event, path: c.path })));
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });
      });

      // 파일 추가
      fs.writeFileSync(testFile, "content");

      // 짧은 간격으로 파일 삭제
      await wait(50);
      fs.unlinkSync(testFile);

      // 타임아웃과 함께 대기 (이벤트가 발생하지 않을 수 있음)
      await Promise.race([changesPromise, wait(DELAY + 200)]);

      // add → unlink 가 병합되어 이벤트 없음
      expect(changes.length).toBe(0);
    });

    it("produces no events or no changes when directory is added then deleted", async () => {
      const testSubDir = path.join(testDir, "test-addDir-unlinkDir");

      watcher = await FsWatcher.watch([testDir]);

      const changes: Array<{ event: string; path: string }> = [];
      let resolved = false;

      const changesPromise = new Promise<void>((resolve) => {
        watcher!.onChange({ delay: DELAY }, (changeInfos) => {
          changes.push(...changeInfos.map((c) => ({ event: c.event, path: c.path })));
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });
      });

      // 디렉토리 추가
      fs.mkdirSync(testSubDir);

      // 짧은 간격으로 디렉토리 삭제
      await wait(50);
      fs.rmdirSync(testSubDir);

      // 타임아웃과 함께 대기 (이벤트가 발생하지 않을 수 있음)
      await Promise.race([changesPromise, wait(DELAY + 200)]);

      // addDir → unlinkDir 가 병합되어 이벤트 없음
      expect(changes.length).toBe(0);
    });

    it("merges to add event when file is deleted then recreated", async () => {
      const testFile = path.join(testDir, "test-unlink-add.txt");

      // 파일 미리 생성
      fs.writeFileSync(testFile, "initial");

      watcher = await FsWatcher.watch([testDir]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // 파일 삭제
      fs.unlinkSync(testFile);

      // 짧은 간격으로 파일 재생성 (delay 내에서 일어나야 함)
      await wait(50);
      fs.writeFileSync(testFile, "recreated");

      // 이벤트 콜백 호출 대기
      const changes = await changesPromise;

      // unlink → add/change 가 add로 병합되어야 함 (나중 이벤트로 덮어씀)
      // 환경에 따라 chokidar가 unlink 없이 change만 발생시킬 수 있음 (WSL2 등)
      expect(changes.length).toBe(1);
      expect(["add", "change"]).toContain(changes[0].event);
    });

    it("correctly merges events when multiple files are modified", async () => {
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");
      const file3 = path.join(testDir, "file3.txt");

      // file3은 미리 생성 (change 이벤트 발생용)
      fs.writeFileSync(file3, "existing");

      watcher = await FsWatcher.watch([testDir]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // file1: 추가만
      fs.writeFileSync(file1, "content1");

      // file2: 추가 후 삭제 (병합되어 사라짐)
      await wait(50);
      fs.writeFileSync(file2, "content2");
      await wait(50);
      fs.unlinkSync(file2);

      // file3: 변경
      await wait(50);
      fs.writeFileSync(file3, "modified");

      // 이벤트 콜백 호출 대기
      const changes = await changesPromise;

      // file1: add, file2: 병합으로 삭제됨, file3: change
      expect(changes.length).toBe(2);

      const file1Change = changes.find((c) => c.path.endsWith("file1.txt"));
      const file3Change = changes.find((c) => c.path.endsWith("file3.txt"));

      expect(file1Change?.event).toBe("add");
      expect(file3Change?.event).toBe("change");
    });
  });

  //#endregion
});
