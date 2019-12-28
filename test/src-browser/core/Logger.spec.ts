import {expect} from "chai";
import * as sinon from "sinon";
import {Logger, LoggerSeverity, LoggerStyle} from "@simplysm/sd-core-browser";
import {DateTime} from "@simplysm/sd-core-common";

describe("(browser) core.Logger", () => {
  const toFormatStringFn = DateTime.prototype.toFormatString;
  let spy: sinon.SinonSpy<any[], void>;
  before(() => {
    DateTime.prototype.toFormatString = (format: string) => {
      return format.includes("HH") ? "2019-01-01 01:01:01.001" : "20190101";
    };
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
    const obj1 = {test: 1};
    const obj2 = {test: 2};
    logger.log("log", obj1, obj2);
    sinon.assert.callCount(spy, 1);
    expect(spy.lastCall.args).to.deep.equal([
      "%c2019-01-01 01:01:01.001\t%c  LOG%c\t",
      LoggerStyle.fgGray,
      LoggerStyle.clear,
      LoggerStyle.clear,
      "log", obj1, obj2
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
      "%c2019-01-01 01:01:01.001\t%c WARN%c\t",
      LoggerStyle.fgGray,
      LoggerStyle.bgYellow,
      LoggerStyle.clear,
      "warn"
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
    expect(spy.lastCall.args).to.deep.equal([
      "%c2019-01-01 01:01:01.001\t[simplysm.core]\t%c WARN%c\t",
      LoggerStyle.fgGray,
      LoggerStyle.bgYellow,
      LoggerStyle.clear,
      "warn"
    ]);

    const logger2 = Logger.get(["simplysm", "core", "test", "Logger"]);
    logger2.info("info");
    sinon.assert.callCount(spy, 2);

    logger2.warn("warn");
    sinon.assert.callCount(spy, 3);
    expect(spy.lastCall.args).to.deep.equal([
      "%c2019-01-01 01:01:01.001\t[simplysm.core.test.Logger]\t%c WARN%c\t",
      LoggerStyle.fgGray,
      LoggerStyle.fgCyan,
      LoggerStyle.clear,
      "warn"
    ]);

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

    expect(Logger.history.map((item) => ({...item, datetime: undefined}))).to.deep.equal([
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