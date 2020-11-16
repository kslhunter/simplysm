import * as os from "os";

export class NetworkUtil {
  public static getCurrentIPs(): string[] {
    const ifaces = os.networkInterfaces();
    return Object.keys(ifaces)
      .map((key) => (
        ifaces[key] ? ifaces[key]!.filter((item) => item.family === "IPv4" && !item.internal) : undefined
      ))
      .filterExists()
      .filter((item) => item.length > 0)
      .mapMany((item) => item.map((item1) => item1.address))
      .filterExists();
  }
}