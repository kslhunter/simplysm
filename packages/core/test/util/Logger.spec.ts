import * as fs from "fs";
import * as assert from "assert";
import * as sinon from "sinon";
import {afterEach, beforeEach, describe, it} from "mocha";
import {Logger} from "../../src/util/Logger";
import * as path from "path";

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
    const logger = new Logger("logger", "test");
    logger.log("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes(logger.config.color.log + "LOG: 로그출력"), true);

    consoleSpy.restore();
  });

  it("'info' 출력", () => {
    const logger = new Logger("logger", "test");
    logger.info("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes(logger.config.color.info + "INFO: 로그출력"), true);
  });

  it("'warn' 출력", () => {
    const logger = new Logger("logger", "test");
    logger.warn("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes(logger.config.color.warn + "WARN: 로그출력"), true);
  });

  it("'error' 출력", () => {
    const logger = new Logger("logger", "test");
    logger.error("로그출력");

    assert.strictEqual(consoleSpy.called, true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes(logger.config.color.error + "ERROR: 로그출력"), true);
  });

  it("'Severity'별 로그 출력 여부를 수정할 수 있음", () => {
    Logger.setDefaultConfig({
      consoleLogSeverities: ["info", "warn", "error"]
    });

    const logger = new Logger("logger", "test");
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

    const logger = new Logger("logger", "test");
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

    const logger = new Logger("logger", "test");
    logger.error("로그출력");

    assert.strictEqual(fs.existsSync(logsDir), true);
    assert.strictEqual(fs.readdirSync(logsDir).length, 1);

    for (const filename of fs.readdirSync(logsDir)) {
      fs.unlinkSync(path.resolve(logsDir, filename));
    }
    fs.rmdirSync(logsDir);
  });

  it("로그 히스토리를 확인할 수 있다.", () => {
    const logger = new Logger("logger", "test");
    logger.log("로그출력1");
    logger.info("로그출력2");
    logger.warn("로그출력3");
    logger.error("로그출력4");

    assert.deepStrictEqual(Logger.history.map(item => item.groupName), ["logger", "logger", "logger", "logger"]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerId), [logger.id, logger.id, logger.id, logger.id]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerName), ["test", "test", "test", "test"]);
    assert.deepStrictEqual(Logger.history.map(item => item.severity), ["log", "info", "warn", "error"]);
    assert.deepStrictEqual(Logger.history.map(item => item.prefix), [undefined, undefined, undefined, undefined]);
    assert.deepStrictEqual(Logger.history.map(item => item.messages), [["로그출력1"], ["로그출력2"], ["로그출력3"], ["로그출력4"]]);
  });

  it("로그 히스토리의 길이를 설정할 수 잇다..", () => {
    Logger.setDefaultConfig({
      historySize: 2
    });

    const logger = new Logger("logger", "test");
    logger.log("로그출력1");
    logger.info("로그출력2");
    logger.warn("로그출력3");
    logger.error("로그출력4");

    assert.deepStrictEqual(Logger.history.map(item => item.groupName), ["logger", "logger"]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerId), [logger.id, logger.id]);
    assert.deepStrictEqual(Logger.history.map(item => item.loggerName), ["test", "test"]);
    assert.deepStrictEqual(Logger.history.map(item => item.severity), ["warn", "error"]);
    assert.deepStrictEqual(Logger.history.map(item => item.prefix), [undefined, undefined]);
    assert.deepStrictEqual(Logger.history.map(item => item.messages), [["로그출력3"], ["로그출력4"]]);
  });

  it("로그의 'Severity'별 색상을 설정할 수 있다.", () => {
    Logger.setDefaultConfig({
      color: {
        grey: "\x1b[0m",
        log: "\x1b[36m",
        info: "\x1b[33m",
        warn: "\x1b[31m",
        error: "\x1b[90m"
      }
    });

    const logger = new Logger("logger", "test");

    logger.log("로그출력");
    assert.strictEqual(consoleSpy.args[0].join(" ").startsWith("\x1b[0m"), true);
    assert.strictEqual(consoleSpy.args[0].join(" ").includes("\x1b[36mLOG: 로그출력"), true);

    logger.info("로그출력");
    assert.strictEqual(consoleSpy.args[1].join(" ").includes("\x1b[33mINFO: 로그출력"), true);

    logger.warn("로그출력");
    assert.strictEqual(consoleSpy.args[2].join(" ").includes("\x1b[31mWARN: 로그출력"), true);

    logger.error("로그출력");
    assert.strictEqual(consoleSpy.args[3].join(" ").includes("\x1b[90mERROR: 로그출력"), true);
  });
});
