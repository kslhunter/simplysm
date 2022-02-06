import { SdServiceServer } from "@simplysm/sd-service/server";
import { SdServiceClient } from "@simplysm/sd-service/client";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";

Logger.setConfig({
  console: {
    level: LoggerSeverity.debug
  }
});

describe("sd-service", () => {
  it("test", async () => {
    const server = new SdServiceServer({
      rootPath: __dirname,
      port: 50080,
      services: []
    });
    await server.listenAsync();

    const client = new SdServiceClient({ host: "localhost", port: 50080 });
    await client.connectAsync();
    await client.sendAsync("TestService", "test", []);
  });
});
