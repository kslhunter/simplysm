import {Injectable} from "@angular/core";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";

@Injectable()
export class SdLogProvider {
  private _genDataFn?: (data: any) => any;
  private _saveListFn?: (genData: any[]) => Promise<void>;

  public constructor(private readonly _localStorage: SdLocalStorageProvider) {
  }

  public initialize<T>(genDataFn?: (data: any) => T, saveListFn?: (genData: T[]) => Promise<void>): void {
    this._genDataFn = genDataFn;
    this._saveListFn = saveListFn;
  }

  public async write(data: any): Promise<boolean> {
    const logs = (this._localStorage.get("sd-logs") || []) as any[];
    if (this._genDataFn) {
      logs.push(this._genDataFn(data));
    }
    else {
      logs.push(data);
    }

    if (this._saveListFn) {
      try {
        await this._saveListFn(logs);
        this._localStorage.remove("sd-logs");
        return true;
      }
      catch (err) {
        this._localStorage.set("sd-logs", logs);

        const sendErrors = this._localStorage.get("sd-logs.send-errors") || [];
        sendErrors.push(err.stack);
        this._localStorage.set("sd-logs.send-errors", sendErrors);

        if (process.env.NODE_ENV !== "production") {
          console.error(err);
        }
      }
    }
    else {
      this._localStorage.set("sd-logs", logs);
    }

    return false;
  }
}