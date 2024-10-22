/* eslint-disable no-console */
import { SdServerContainer } from "../src";
import path from "path";

describe("SdServerContainer", () => {
  it("start", async () => {
    const proc = await SdServerContainer.startAsync({
      cwd: path.resolve(process.cwd(), "test/serv"),
    });
    console.log("started", proc);
  });

  it("list", async () => {
    const list = await SdServerContainer.listAsync();
    console.log(
      list
        .map((item) =>
          [
            `[${item.pm_id}:${item.name}]`,
            `[STATUS:${item.pm2_env?.status}]`,
            `[RESTART:${item.pm2_env?.restart_time}]`,
            `[PID:${item.pid}]`,
            `[CPU:${item.monit?.cpu?.toLocaleString()}]`,
            `[MEM:${Math.round((item.monit?.memory ?? 0) / 1024 / 1024).toLocaleString()}MB]`,
          ].join(" "),
        )
        .join("\n"),
    );
  });

  it("kill", async () => {
    await SdServerContainer.killAsync();
    console.log("killed");
  });
});
