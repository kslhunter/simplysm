import * as os from "os";

export class NetworkUtils {
  public static getCurrentIPs(): string[] {
    /*return await new Promise<string>(resolve => {
      https.request({
        hostname: "api.ipify.org",
        path: "/",
        method: "GET"
      }, res => {
        res.on("data", chunk => {
          resolve(chunk.toString());
          res.destroy();
        });
      }).end();
    });*/

    const ifaces = os.networkInterfaces();
    return Object.keys(ifaces)
      .map(key => (
        ifaces[key] ? ifaces[key]!.filter(item => item.family === "IPv4" && !item.internal) : undefined
      ))
      .filterExists()
      .filter(item => item.length > 0)
      .mapMany(item => item.map(item1 => item1.address))
      .filterExists();
  }
}