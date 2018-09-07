import * as fs from "fs";
import * as assert from "assert";
import * as sinon from "sinon";
import {afterEach, beforeEach, describe, it} from "mocha";
import * as path from "path";
import {Logger} from "@simplism/core";

describe("Logger", () => {
  let consoleSpy: sinon.SinonSpy;

  beforeEach(() => {
    consoleSpy = sinon.spy(console, "log");
  });

  afterEach(() => {
    consoleSpy.restore();
    Logger.restoreDefaultConfig();
    Logger.restoreGroupConfig();
    Logger.history = [];
  });

  it("'log' 출력", () => {
    const logger = new Logger("logger");
    logger.log("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("[LOG]"), true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("로그출력"), true);

    consoleSpy.restore();
  });

  it("'info' 출력", () => {
    const logger = new Logger("logger");
    logger.info("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("[INFO]"), true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("로그출력"), true);
  });

  it("'warn' 출력", () => {
    const logger = new Logger("logger");
    logger.warn("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("[WARN]"), true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("로그출력"), true);
  });

  it("'error' 출력", () => {
    const logger = new Logger("logger");
    logger.error("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("[ERROR]"), true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("로그출력"), true);
  });

  it("'Severity'별 로그 출력 여부를 수정할 수 있음", () => {
    Logger.setDefaultConfig({
      consoleLogSeverities: ["info", "warn", "error"]
    });

    const logger = new Logger("logger");
    logger.log("로그출력");
    assert.strictEqual(consoleSpy.notCalled, true);


    logger.info("로그출력");
    assert.strictEqual(consoleSpy.called, true);
  });

  it("'Severity'별 로그를 파일로 출력할 수 있음", () => {
    Logger.setDefaultConfig({
      fileLogSeverities: ["error"]
    });

    const logsDir = path.resolve(process.cwd(), "logs");

    const logger = new Logger("logger");
    logger.log("로그출력");

    assert.strictEqual(fs.existsSync(logsDir), false);

    logger.error("로그출력");

    assert.strictEqual(fs.existsSync(logsDir), true);
    assert.strictEqual(fs.readdirSync(logsDir).length, 1);

    for (const filename of fs.readdirSync(logsDir)) {
      fs.unlinkSync(path.resolve(logsDir, filename));
    }
    fs.rmdirSync(logsDir);
  });

  it("로그를 파일로 출력할 경로를 지정할 수 있음", () => {
    Logger.setDefaultConfig({
      fileLogSeverities: ["error"],
      outputPath: "_logs"
    });

    const logsDir = path.resolve(process.cwd(), "_logs");

    const logger = new Logger("logger");
    logger.error("로그출력");

    assert.strictEqual(fs.existsSync(logsDir), true);
    assert.strictEqual(fs.readdirSync(logsDir).length, 1);

    for (const filename of fs.readdirSync(logsDir)) {
      fs.unlinkSync(path.resolve(logsDir, filename));
    }
    fs.rmdirSync(logsDir);
  });

  it("로그 히스토리를 확인할 수 있다.", () => {
    const logger = new Logger("logger");
    logger.log("로그출력1");
    logger.info("로그출력2");
    logger.warn("로그출력3");
    logger.error("로그출력4");

    assert.deepStrictEqual(Logger.history.map(item => item.groupName), ["logger", "logger", "logger", "logger"]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerId), [logger.id, logger.id, logger.id, logger.id]);
    assert.deepStrictEqual(Logger.history.map(item => item.at).every(at => at.includes("Logger.spec.ts")), true);
    assert.deepStrictEqual(Logger.history.map(item => item.severity), ["log", "info", "warn", "error"]);
    assert.deepStrictEqual(Logger.history.map(item => item.prefix), [undefined, undefined, undefined, undefined]);
    assert.deepStrictEqual(Logger.history.map(item => item.messages), [["로그출력1"], ["로그출력2"], ["로그출력3"], ["로그출력4"]]);
  });

  it("로그 히스토리의 길이를 설정할 수 잇다..", () => {
    Logger.setDefaultConfig({
      historySize: 2
    });

    const logger = new Logger("logger");
    logger.log("로그출력1");
    logger.info("로그출력2");
    logger.warn("로그출력3");
    logger.error("로그출력4");

    assert.deepStrictEqual(Logger.history.map(item => item.groupName), ["logger", "logger"]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerId), [logger.id, logger.id]);
    assert.deepStrictEqual(Logger.history.map(item => item.at).every(at => at.includes("Logger.spec.ts")), true);
    assert.deepStrictEqual(Logger.history.map(item => item.severity), ["warn", "error"]);
    assert.deepStrictEqual(Logger.history.map(item => item.prefix), [undefined, undefined]);
    assert.deepStrictEqual(Logger.history.map(item => item.messages), [["로그출력3"], ["로그출력4"]]);
  });
});
