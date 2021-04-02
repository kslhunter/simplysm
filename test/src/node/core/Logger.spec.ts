import { expect } from "chai";
import * as sinon from "sinon";
import * as path from "path";
import * as fs from "fs";
import { FsUtil, Logger, LoggerSeverity, LoggerStyle } from "@simplysm/sd-core-node";
import { DateTime } from "@simplysm/sd-core-common";

describe("(node) core.Logger", () => {
  const toFormatStringFn = DateTime.prototype.toFormatString;
  let spy: sinon.SinonSpy<any[], void>;
  before(() => {
    DateTime.prototype.toFormatString = (format: string): string => (
      format.includes("HH") ? "2019-01-01 01:01:01.001" : "20190101"
    );
  });

  after(() => {
    DateTime.prototype.toFormatString = toFormatStringFn;
  });

  beforeEach(() => {
    spy = sinon.spy(console, "log");
  });

  afterEach(() => {
    spy.restore();
  });


  it("log, info, warn, error 방식으로 오류를 표시할 수 있다. 로그레벨에 따라 색상으로 구분한다.", () => {
    const logger = Logger.get();
    const obj1 = { test: 1 };
    const obj2 = { test: 2 };
    logger.log("log", obj1, obj2);
    sinon.assert.callCount(spy, 1);
    expect(spy.lastCall.args).to.deep.equal([
      LoggerStyle.fgGray + "2019-01-01 01:01:01.001 "
      + LoggerStyle.clear + "  LOG",
      "log",
      obj1,
      obj2,
      LoggerStyle.clear
    ]);

    logger.info("info");
    sinon.assert.callCount(spy, 2);
    expect(spy.args[1][0]).to.includes(" INFO");

    logger.warn("warn");
    sinon.assert.callCount(spy, 3);
    expect(spy.args[2][0]).to.includes(" WARN");

    logger.error("error");
    sinon.assert.callCount(spy, 4);
    expect(spy.args[3][0]).to.includes("ERROR");
  });

  it("전체 로깅 레벨 및 색상을 설정할 수 있다. 해당 로깅레벨 이하인 로그는 표시되지 않는다.", () => {
    Logger.setConfig({
      console: {
        level: LoggerSeverity.warn,
        styles: {
          info: LoggerStyle.bgMagenta,
          warn: LoggerStyle.bgYellow
        }
      }
    });

    const logger = Logger.get();
    logger.info("info");
    sinon.assert.notCalled(spy);

    logger.warn("warn");
    sinon.assert.callCount(spy, 1);
    expect(spy.lastCall.args).to.deep.equal([
      LoggerStyle.fgGray + "2019-01-01 01:01:01.001 "
      + LoggerStyle.bgYellow + " WARN",
      "warn",
      LoggerStyle.clear
    ]);

    Logger.restoreConfig();
  });

  it("그룹별로 로깅 레벨 및 색상을 설정할 수 있으며, 그룹은 Hierarchical 구조로 동작한다.", () => {
    Logger.setConfig(["simplysm", "core"], {
      console: {
        level: LoggerSeverity.warn,
        styles: {
          warn: LoggerStyle.bgYellow
        }
      }
    });

    Logger.setConfig(["simplysm", "core", "test"], {
      console: {
        level: LoggerSeverity.info,
        styles: {
          warn: LoggerStyle.fgCyan
        }
      }
    });

    const logger1 = Logger.get(["simplysm", "core"]);

    logger1.info("info");
    sinon.assert.notCalled(spy);

    logger1.warn("warn");
    sinon.assert.callCount(spy, 1);
    expect(spy.lastCall.args[0]).to.includes(LoggerStyle.bgYellow);

    const logger2 = Logger.get(["simplysm", "core", "test", "Logger"]);
    logger2.info("info");
    sinon.assert.callCount(spy, 2);

    logger2.warn("warn");
    sinon.assert.callCount(spy, 3);
    expect(spy.lastCall.args[0]).to.includes(LoggerStyle.fgCyan);

    Logger.restoreConfig();
  });

  it("로그를 파일로 저장할 수 있으며, 별도의 전체/그룹별 로깅레벨 설정을 따른다.", () => {
    FsUtil.remove(path.resolve(__dirname, "logs"));

    Logger.setConfig(["simplysm", "core"], {
      console: {
        level: LoggerSeverity.none
      },
      file: {
        level: LoggerSeverity.log,
        outDir: path.resolve(__dirname, "logs")
      }
    });

    Logger.setConfig(["simplysm", "core", "test", "Logger"], {
      console: {
        level: LoggerSeverity.none
      },
      file: {
        level: LoggerSeverity.info,
        outDir: path.resolve(__dirname, "logs", "logger")
      }
    });

    const logger1 = Logger.get(["simplysm", "core", "test"]);
    logger1.log("log");
    logger1.log("log");
    expect(fs.readdirSync(path.resolve(__dirname, "logs"))[0]).to.equal("20190101");
    expect(fs.readdirSync(path.resolve(__dirname, "logs", "20190101"))[0]).to.equal("1.log");
    expect(fs.readFileSync(path.resolve(__dirname, "logs", "20190101", "1.log"), "utf-8"))
      .to.equal("2019-01-01 01:01:01.001 [simplysm.core.test]   LOG\r\nlog\r\n2019-01-01 01:01:01.001 [simplysm.core.test]   LOG\r\nlog\r\n");

    const logger2 = Logger.get(["simplysm", "core", "test", "Logger"]);
    logger2.log("log");
    expect(FsUtil.exists(path.resolve(__dirname, "logs", "logger"))).to.equal(false);

    logger2.info("info");
    expect(fs.readdirSync(path.resolve(__dirname, "logs", "logger"))[0]).to.equal("20190101");
    expect(fs.readdirSync(path.resolve(__dirname, "logs", "logger", "20190101"))[0]).to.equal("1.log");
    expect(fs.readFileSync(path.resolve(__dirname, "logs", "logger", "20190101", "1.log"), "utf-8"))
      .to.equal("2019-01-01 01:01:01.001 [simplysm.core.test.Logger]  INFO\r\ninfo\r\n");

    FsUtil.remove(path.resolve(__dirname, "logs"));

    Logger.restoreConfig();
  });

  it("로그를 파일로 저장할 때, 파일 용량이 4메가를 넘으면, 다음 파일로 넘어가서 생성된다.", () => {
    FsUtil.remove(path.resolve(__dirname, "logs"));

    Logger.setConfig({
      console: {
        level: LoggerSeverity.none
      },
      file: {
        level: LoggerSeverity.log,
        outDir: path.resolve(__dirname, "logs")
      }
    });

    const logger1 = Logger.get(["simplysm", "core", "test"]);
    logger1.log(Buffer.alloc(1000000));
    logger1.log(Buffer.alloc(1000000));
    logger1.log(Buffer.alloc(1000000));
    expect(fs.readdirSync(path.resolve(__dirname, "logs", "20190101"))).to.deep.equal(["1.log", "2.log"]);

    FsUtil.remove(path.resolve(__dirname, "logs"));

    Logger.restoreConfig();
  });

  it("지금까지의 로그 이력을 확인할 수 있다. 로깅레벨과 관계없이 모든 이력이 확인된다.", () => {
    Logger.setHistoryLength(2);

    const logger = Logger.get();
    logger.log("log");
    expect(Logger.history).to.length(1);
    logger.info("info");
    expect(Logger.history).to.length(2);
    logger.warn("warn");
    expect(Logger.history).to.length(2);

    expect(Logger.history.map((item) => ({ ...item, datetime: undefined }))).to.deep.equal([
      {
        datetime: undefined,
        group: [],
        severity: LoggerSeverity.info,
        logs: ["info"]
      },
      {
        datetime: undefined,
        group: [],
        severity: LoggerSeverity.warn,
        logs: ["warn"]
      }
    ]);

    Logger.setHistoryLength(0);
  });
});
