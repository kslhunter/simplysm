import { Pm2Promise } from "./Pm2Promise";

export abstract class SdServerContainer {
  // static #logger = Logger.get(["sd-serv", "SdServerContainer"]);

  static async listAsync() {
    return await Pm2Promise.connectAsync(async () => {
      return await Pm2Promise.listAsync();
    });
  }

  static async killAsync() {
    await Pm2Promise.connectAsync(async () => {
      await Pm2Promise.killAsync();
    });
  }

  static async startAsync(options?: { cwd?: string }) {
    return await Pm2Promise.connectAsync(async () => {
      return await Pm2Promise.startAsync(options);
    });
  }

  static async stopAsync(id: number) {
    return await Pm2Promise.connectAsync(async () => {
      return await Pm2Promise.stopAsync(id);
    });
  }

  static async restartAsync(id: number) {
    return await Pm2Promise.connectAsync(async () => {
      return await Pm2Promise.restartAsync(id);
    });
  }

  static async deleteAsync(id: number) {
    return await Pm2Promise.connectAsync(async () => {
      return await Pm2Promise.deleteAsync(id);
    });
  }
}
