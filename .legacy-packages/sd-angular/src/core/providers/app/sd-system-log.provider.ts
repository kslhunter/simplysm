/* eslint-disable no-console */
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;

  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
    console[severity](...data);

    if (this.writeFn) {
      try {
        await this.writeFn(severity, ...data);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
