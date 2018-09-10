import * as os from "os";

export class CliHelper {
  public static getCurrentIP(selectors: (string | undefined)[]): string {
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
        .single(addr => new RegExp(ipRegExpString).test(addr));
      if (!result) {
        continue;
      }
      return result;
    }

    throw new Error(`"${selectors.join(`", "`)}"와 매칭되는 아이피 주소를 찾을 수 없습니다.`);
  }
}