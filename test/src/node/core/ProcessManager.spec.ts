import { expect } from "chai";
import { ProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";

describe("(node) core.ProcessManager", () => {
  it("특정 프로세스를 비동기식으로 실행할 수 있다.", async () => {
    const result = await ProcessManager.spawnAsync("echo %cd%");
    expect(result).to.equal(process.cwd());
  });

  it("실행할 위치(cwd) 를 설정할 수 있다.", async () => {
    const result = await ProcessManager.spawnAsync("echo %cd%", {
      cwd: path.resolve(process.cwd(), "..")
    });
    expect(result).to.equal(path.resolve(process.cwd(), ".."));
  });

  it("일반 메시지를 위한 messageHandler 와 오류 메시지를 위한 errorMessageHandler 를 설정할 수 있으며, true 를 반환시켜, 프로세스를 강제 종료 시킬 수 있다.", async () => {
    let cnt = 0;
    await ProcessManager.spawnAsync(
      "node ./ProcessManagerTestDir/test.js",
      { cwd: __dirname },
      message => {
        expect(message).to.equal("1");
        cnt += 1;
      },
      errorMessage => {
        expect(errorMessage).to.equal("2");
        cnt += 1;
        return true;
      }
    );

    expect(cnt).to.equal(2);
  });

  it("env 옵션을 통해 해당 프로세스만을 위한 환경변수를 설정할 수 있다.", async () => {
    const result = await ProcessManager.spawnAsync(
      "node ./ProcessManagerTestDir/env-test.js",
      {
        cwd: __dirname,
        env: {
          TEST: "!!!"
        }
      }
    );

    expect(result).to.equal("!!!");
  });
});