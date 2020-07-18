import { expect } from "chai";
import * as path from "path";
import { FsUtils, FsWatcher } from "@simplysm/sd-core-node";
import { Wait } from "@simplysm/sd-core-common";

describe("(node) core.FsWatcher", () => {
  const testDirPath = path.resolve(__dirname, "FsWatcherTestDir");
  beforeEach(async () => {
    await FsUtils.removeAsync(testDirPath);
    await FsUtils.mkdirsAsync(testDirPath);
  });

  it("추가/수정/삭제 3가지에 대해 파일 혹은 디렉토리의 변경을 감지할 수 있다. (이때 감지위치 설정은 '../**/*' 방식이다)", async () => {
    const testFile1Path = path.resolve(testDirPath, "test.txt");

    let result: any;
    const watcher = await FsWatcher.watchAsync(path.resolve(testDirPath, "**", "*.txt"), changedInfos => {
      expect(changedInfos).to.deep.equal([
        {
          type: "add",
          filePath: testFile1Path
        }
      ]);
      result = "success";
    }, err => {
      result = err;
    });

    await FsUtils.writeFileAsync(testFile1Path, "1234");

    await Wait.true(() => result);
    watcher.close();

    if (result !== "success") {
      expect.fail(result.message);
    }
  });

  it("최초 실행시에는 변경이벤트가 발생하지 않는다.", async () => {
    const watcher = await FsWatcher.watchAsync(path.resolve(testDirPath, "**", "*.txt"), () => {
      expect.fail();
    }, err => {
      expect.fail(err.message);
    });

    await Wait.time(100);
    watcher.close();
  });

  it("여러 감지 결과가 통합되어, 이벤트가 한번에 발생한다.", async () => {
    const testFile1Path = path.resolve(testDirPath, "test1.txt");
    const testFile2Path = path.resolve(testDirPath, "test2.txt");

    let result: any;
    const watcher = await FsWatcher.watchAsync(path.resolve(testDirPath, "**", "*.txt"), changedInfos => {
      result = changedInfos;
    }, err => {
      result = err;
    }, {
      aggregateTimeout: 30
    });

    await FsUtils.writeFileAsync(testFile1Path, "1234");
    await FsUtils.writeFileAsync(testFile2Path, "1234");

    await Wait.true(() => result);
    watcher.close();

    if (result instanceof Error) {
      expect.fail(result.message);
    }
    else {
      expect(result).to.deep.equal([
        {
          type: "add",
          filePath: testFile1Path
        },
        {
          type: "add",
          filePath: testFile2Path
        }
      ]);
    }
  });

  it("aggregateTimeout 옵션을 통해, 통합시간을 설정할 수 있다. " +
    "마지막 변경에서 부터 이 시간이 지나는 동안 변경사항이 없으면, 변경 이벤트가 발생한다.", async () => {
    const testFile1Path = path.resolve(testDirPath, "test1.txt");
    const testFile2Path = path.resolve(testDirPath, "test2.txt");

    let result: any;
    const watcher = await FsWatcher.watchAsync(path.resolve(testDirPath, "**", "*.txt"), changedInfos => {
      expect(changedInfos).to.deep.equal([
        {
          type: "add",
          filePath: testFile1Path
        },
        {
          type: "add",
          filePath: testFile2Path
        }
      ]);
      result = "success";
    }, err => {
      result = err;
    }, { aggregateTimeout: 50 });

    await FsUtils.writeFileAsync(testFile1Path, "1234");
    await Wait.time(20);
    await FsUtils.writeFileAsync(testFile2Path, "1234");

    await Wait.true(() => result);
    watcher.close();

    if (result !== "success") {
      expect.fail(result.message);
    }
  });

  it("close 를 통해 감지를 종료할 수 있다.", async () => {
    const testFile1Path = path.resolve(testDirPath, "test.txt");

    const watcher = await FsWatcher.watchAsync(path.resolve(testDirPath, "**", "*.txt"), () => {
      expect.fail();
    }, err => {
      expect.fail(err.message);
    });

    watcher.close();
    await FsUtils.writeFileAsync(testFile1Path, "1234");
    await Wait.time(500);
  });
});
