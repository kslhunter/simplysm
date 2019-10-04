import {ErrorHandler, Injectable} from "@angular/core";
import {SdLogProvider} from "./SdLogProvider";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  public constructor(private readonly _log: SdLogProvider) {
  }

  public async handleError(error: any): Promise<void> {
    const err = error.rejection ? error.rejection : error;

    if (!err.handled) {
      await this._log.write({error: err.stack, type: "error"});

      if (process.env.NODE_ENV === "production") {
        alert(`처리되지 않은 오류가 발생하였습니다.\r\n\r\n${err.message}`);
        throw err;
        /*location.reload();*/
      }
      else {
        throw err;
      }
    }
  }
}
