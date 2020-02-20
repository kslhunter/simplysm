import {Injectable} from "@angular/core";

@Injectable()
export class SdSystemLogProvider {
  public writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;

  public async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
    if (this.writeFn) {
      await this.writeFn(severity, ...data);
    }
  }
}