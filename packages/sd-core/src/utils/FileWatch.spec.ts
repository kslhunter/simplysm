import "../index";
import * as fs from "fs-extra";
import * as Assert from "assert";
import {FileWatcher} from "./FileWatcher";
import * as path from "path";

describe("파일와쳐", function (): void {
  this.timeout(50000);

  it("와칭", done => {
    fs.watch(__dirname, {recursive: true}, (event, filename) => {
      console.log(event, filename);
    });

    setTimeout(() => {
      done();
    }, 30000);
  });

  it("패스", () => {
    const watchPath = "D:/aaa/**/*.ts";
    const watchRootPath = watchPath.slice(0, watchPath.indexOf("*"));
    Assert.strictEqual(watchRootPath, "D:/aaa/");
  });

  it("테스트", async done => {
    await FileWatcher.watch(
      [path.resolve(__dirname, "utils", "**", "*.ts"), path.resolve(__dirname, "index.ts")],
      ["add", "change", "unlink"],
      (watcher, changedFiles) => {
        console.log(changedFiles);
      },
      {}
    );

    setTimeout(() => {
      done();
    }, 30000);
  });
});