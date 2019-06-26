import {ISdWorkerMessage} from "./interfaces";
import CpuUsage = NodeJS.CpuUsage;

export class SdWorkerUtils {
  private static _cpuUsage: CpuUsage;

  public static sendMessage(message: ISdWorkerMessage): void {
    if (message.type === "run") {
      SdWorkerUtils._cpuUsage = process.cpuUsage();
    }
    else if (message.type === "done") {
      const usage = process.cpuUsage(SdWorkerUtils._cpuUsage);
      Object.assign(message, {message: {cpuUsage: Math.floor((usage.user + usage.system) / 1000)}});
    }

    process.send!(message, (err: Error) => {
      if (err) throw err;
    });
  }
}
