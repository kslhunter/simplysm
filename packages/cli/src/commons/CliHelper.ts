import * as os from "os";
import {Logger} from "@simplism/core";

export class CliHelper {
  public static getCurrentIP(hostOrHosts: string | string[] | undefined): string {
    const selectors = hostOrHosts
      ? typeof hostOrHosts === "string"
        ? [hostOrHosts] as string[]
        : hostOrHosts as string[]
      : [undefined];

    for (const selector of selectors) {
      if (selector && !selector.includes(".")) {
        return selector;
      }

      const ipRegExpString = selector
        ? selector.replace(/\./g, "\\.").replace(/\*/g, "[0-9]*")
        : ".*";

      const ifaces = os.networkInterfaces();
      const result = Object.keys(ifaces)
        .map(key => ifaces[key].filter(item => item.family === "IPv4" && !item.internal))
        .filter(item => item.length > 0).mapMany(item => item.map(item1 => item1.address))
        .filter(addr => new RegExp(ipRegExpString).test(addr));
      if (result.length < 1) {
        continue;
      }
      if (result.length > 1) {
        new Logger("@simplism/cli", "CliHelper: ").warn(`IP ${result.join(", ")}중 ${result[0]}이 선택되었습니다.`);
      }
      return result[0];
    }

    throw new Error(`"${selectors.join(`", "`)}"와 매칭되는 아이피 주소를 찾을 수 없습니다.`);
  }
}
