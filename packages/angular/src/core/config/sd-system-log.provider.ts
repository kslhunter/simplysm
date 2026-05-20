import { Injectable } from "@angular/core";
import consola from "consola";

@Injectable({ providedIn: "root" })
export class SdSystemLogProvider {
  private readonly _logger = consola.withTag("angular:system-log");

  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;

  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
    const log = this._logger[severity].bind(this._logger) as (...args: any[]) => void;
    log(...data);

    if (this.writeFn) {
      try {
        await this.writeFn(severity, ...data);
      } catch (err) {
        this._logger.error(err);
      }
    }
  }
}
