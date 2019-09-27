import * as Mocha from "mocha";

export class SdMochaReporter extends Mocha.reporters.Base {
  public constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
    super(runner);

    runner.on("fail", (test, err) => {
      if (options && options.reporterOptions.logger) {
        options.reporterOptions.logger.error("오류가 발생했습니다: " + test.title + "\n" + err.stack + "\n");
      }
      else {
        process.stderr.write(test.title + ": " + err.stack + "\n");
      }
    });
  }
}