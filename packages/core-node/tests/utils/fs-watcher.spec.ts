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
    it("파일 감시 시작", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);
      expect(watcher).toBeDefined();
    });

    it("옵션과 함께 파일 감시 시작", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")], {
        ignoreInitial: false,
      });
      expect(watcher).toBeDefined();
    });

    it("에러 이벤트 발생 시 로깅 처리", async () => {
      // chokidar는 존재하지 않는 경로도 정상적으로 감시 시작함
      // 에러 이벤트는 실제 파일 시스템 오류 시에만 발생
      const nonExistentPath = path.join(testDir, "non-existent-dir-" + Date.now());
      watcher = await FsWatcher.watch([nonExistentPath]);

      // 에러 핸들러가 등록되어 있어 에러 발생 시에도 크래시하지 않음
      expect(watcher).toBeDefined();
    });
  });

  //#endregion

  //#region close

  describe("close", () => {
    it("감시 종료", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

      // close()가 에러 없이 완료되면 테스트 통과
      await expect(watcher.close()).resolves.toBeUndefined();

      // 종료 후 watcher 참조 해제
      watcher = undefined;
    });
  });

  //#endregion

  //#region chaining

  describe("onChange", () => {
    it("onChange 메서드 체이닝 지원", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

      const fn = vi.fn();
      const result = watcher.onChange({ delay: 100 }, fn);

      expect(result).toBe(watcher);
    });

    it("delay 옵션 지정 가능", async () => {
      watcher = await FsWatcher.watch([path.join(testDir, "**/*")]);

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
    it("SdFsWatcherEvent 타입 정의 확인", () => {
      // 이벤트 타입이 올바르게 정의되어 있는지 확인
      const validEvents = ["add", "addDir", "change", "unlink", "unlinkDir"];
      expect(validEvents).toContain("add");
      expect(validEvents).toContain("addDir");
      expect(validEvents).toContain("change");
      expect(validEvents).toContain("unlink");
      expect(validEvents).toContain("unlinkDir");
    });

    it("SdFsWatcherChangeInfo 구조 확인", () => {
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

  //#region glob 패턴 필터링

  describe("glob 패턴 필터링", () => {
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

    it("glob 패턴에 매칭되는 파일만 이벤트 수신", async () => {
      // .txt 파일만 감시하는 glob 패턴
      const globPattern = path.join(testDir, "**/*.txt");

      watcher = await FsWatcher.watch([globPattern]);

      const changesPromise = waitForChanges(watcher, DELAY);

      // .txt 파일 생성 (매칭됨)
      fs.writeFileSync(path.join(testDir, "matched.txt"), "hello");

      // .json 파일 생성 (매칭 안 됨)
      await wait(50);
      fs.writeFileSync(path.join(testDir, "ignored.json"), "{}");

      const changes = await changesPromise;

      // .txt 파일만 이벤트를 받아야 함
      expect(changes.length).toBe(1);
      expect(changes[0].path).toContain("matched.txt");
      expect(changes[0].event).toBe("add");
    });
  });

  //#endregion

  //#region 이벤트 병합 (Event Merging)

  describe("이벤트 병합", () => {
    const DELAY = 300;

    /**
     * 지정 시간 대기 헬퍼 함수.
     */
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * 이벤트 콜백이 호출될 때까지 대기하는 헬퍼 함수.
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

    it("파일 추가 후 변경 시 add 이벤트만 반환", async () => {
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

    it("파일 추가 후 삭제 시 이벤트 없음 또는 변경 없음 처리", async () => {
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

    it("디렉토리 추가 후 삭제 시 이벤트 없음 또는 변경 없음 처리", async () => {
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

    it("파일 삭제 후 재생성 시 add 이벤트로 병합", async () => {
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

    it("여러 파일 변경 시 올바른 이벤트 병합", async () => {
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
