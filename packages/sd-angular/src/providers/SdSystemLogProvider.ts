import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;

  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
    if (this.writeFn) {
      await this.writeFn(severity, ...data);
    }
    else {
      // eslint-disable-next-line no-console
      console[severity](...data);
    }
  }
}
