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

  //#region Event Merging

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

      // Add file
      fs.writeFileSync(testFile, "initial");

      // Modify file with short interval (must occur within delay)
      await wait(50);
      fs.writeFileSync(testFile, "modified");

      // Wait for event callback
      const changes = await changesPromise;

      // add → change should be merged to add
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

      // Add file
      fs.writeFileSync(testFile, "content");

      // Delete file with short interval
      await wait(50);
      fs.unlinkSync(testFile);

      // Wait with timeout (event may not occur)
      await Promise.race([changesPromise, wait(DELAY + 200)]);

      // add → unlink merged, no events
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

      // Add directory
      fs.mkdirSync(testSubDir);

      // Delete directory with short interval
      await wait(50);
      fs.rmdirSync(testSubDir);

      // Wait with timeout (event may not occur)
      await Promise.race([changesPromise, wait(DELAY + 200)]);

      // addDir → unlinkDir merged, no events
      expect(changes.length).toBe(0);
    });

    it("merges to add event when file is deleted then recreated", async () => {
      const testFile = path.join(testDir, "test-unlink-add.txt");

      // Pre-create file
      fs.writeFileSync(testFile, "initial");

      watcher = await FsWatcher.watch([testDir]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // Delete file
      fs.unlinkSync(testFile);

      // Recreate file with short interval (must occur within delay)
      await wait(50);
      fs.writeFileSync(testFile, "recreated");

      // Wait for event callback
      const changes = await changesPromise;

      // unlink → add/change should be merged to add (overwritten by later event)
      // Depending on environment, chokidar may only emit change without unlink (WSL2, etc)
      expect(changes.length).toBe(1);
      expect(["add", "change"]).toContain(changes[0].event);
    });

    it("correctly merges events when multiple files are modified", async () => {
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");
      const file3 = path.join(testDir, "file3.txt");

      // Pre-create file3 (to trigger change event)
      fs.writeFileSync(file3, "existing");

      watcher = await FsWatcher.watch([testDir]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // file1: only add
      fs.writeFileSync(file1, "content1");

      // file2: add then delete (merged and removed)
      await wait(50);
      fs.writeFileSync(file2, "content2");
      await wait(50);
      fs.unlinkSync(file2);

      // file3: modify
      await wait(50);
      fs.writeFileSync(file3, "modified");

      // Wait for event callback
      const changes = await changesPromise;

      // file1: add, file2: removed by merge, file3: change
      expect(changes.length).toBe(2);

      const file1Change = changes.find((c) => c.path.endsWith("file1.txt"));
      const file3Change = changes.find((c) => c.path.endsWith("file3.txt"));

      expect(file1Change?.event).toBe("add");
      expect(file3Change?.event).toBe("change");
    });
  });

  //#endregion
});
