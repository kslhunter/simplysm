import {expect} from "chai";
import {SdServiceEventBase} from "@simplysm/sd-service-common";
import {SdServiceClient} from "@simplysm/sd-service-browser";

describe("(browser) service.SdServiceClient", () => {
  class TestEvent extends SdServiceEventBase<{ name: string }, string> {
  }

  const port = 50081;
  let client: SdServiceClient;

  before(async () => {
    await new Promise<void>((resolve, reject) => {
      const xobj = new XMLHttpRequest();
      xobj.open("POST", "startServer", true);
      xobj.onreadystatechange = (): void => {
        if (xobj.readyState === 4) {
          if (xobj.status === 200) {
            resolve();
          }
          else {
            reject(new Error(`오류발생 (code:${xobj.status})`));
          }
        }
      };
      xobj.send(JSON.stringify({port}));
    });

    client = new SdServiceClient(port, "localhost");
    await client.connectAsync();
  });

  after(async () => {
    await client.closeAsync();

    await new Promise<void>((resolve, reject) => {
      const xobj = new XMLHttpRequest();
      xobj.open("POST", "stopServer", true);
      xobj.onreadystatechange = (): void => {
        if (xobj.readyState === 4) {
          if (xobj.status === 200) {
            resolve();
          }
          else {
            reject(new Error(`오류발생 (code:${xobj.status})`));
          }
        }
      };
      xobj.send();
    });
  });

  it("서버로 명령 전달", async () => {
    const result = await client.sendAsync("TestService.getTextAsync", ["aaa"]);
    expect(result).to.equal("입력값: aaa");
  });

  it("서버로 명령 전달 (분할요청)", async () => {
    const longStr = Buffer.alloc(100001, "a").toString();
    let count = 0;
    const result = await client.sendAsync("TestService.getTextAsync", [longStr], {
      progressCallback: progress => {
        count++;
      }
    });
    expect(count).to.equal(12);
    expect(result).to.equal("입력값: " + longStr);
  });


  it("이벤트 등록 및 여러곳에서 이벤트 발생 확인", async () => {
    const subClients = [
      new SdServiceClient(port, "localhost"),
      new SdServiceClient(port, "localhost"),
      new SdServiceClient(port, "localhost"),
      new SdServiceClient(port, "localhost")
    ];

    let listenCount = 0;

    const listenerIdPairs: [SdServiceClient, number][] = [];
    await subClients.parallelAsync(async (subClient, index) => {
      await subClient.connectAsync();

      if (index === 1) {
        listenerIdPairs.push(
          [
            subClient,
            await subClient.addEventListenerAsync(TestEvent, {name: "not-listen"}, () => {
              expect.fail();
            })
          ]
        );
      }
      else {
        listenerIdPairs.push(
          [
            subClient,
            await subClient.addEventListenerAsync(TestEvent, {name: "listen"}, result => {
              expect(result).equal("이벤트 발생");
              listenCount++;
            })
          ]
        );
      }
    });

    await client.emitAsync(TestEvent, info => info.name === "listen", "이벤트 발생");
    expect(listenCount).equal(3);

    // 리스닝 제거

    listenCount = 0;
    await listenerIdPairs.parallelAsync(async listenerIdPair => {
      await listenerIdPair[0].removeEventListenerAsync(listenerIdPair[1]);
    });
    await client.emitAsync(TestEvent, info => info.name === "listen", "이벤트 발생");
    expect(listenCount).equal(0);
  });

  it("업로드", async () => {
    const blob = new Blob(["123456"], {type: "text/html"});
    await client.uploadAsync(blob, "test.txt");

    await client.sendAsync("TestService.removeFileAsync", ["test.txt"]);
  });

  it("업로드 (분할요청)", async () => {
    const longStr = Buffer.alloc(100001, "a").toString();
    let count = 0;
    const blob = new Blob([longStr], {type: "text/html"});
    await client.uploadAsync(blob, "test2.txt", {
      progressCallback: progress => {
        count++;
      },
      splitLength: 10000
    });
    expect(count).to.equal(12);

    await client.sendAsync("TestService.removeFileAsync", ["test2.txt"]);
  });
});
