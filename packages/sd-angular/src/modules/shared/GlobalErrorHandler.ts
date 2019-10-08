import {ErrorHandler, Injectable, Injector} from "@angular/core";
import {SdLogProvider} from "./SdLogProvider";
import {Router} from "@angular/router";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  public constructor(private readonly _injector: Injector) {
  }

  public async handleError(error: any): Promise<void> {
    const err = error.rejection ? error.rejection : error;

    if (!err.handled) {
      const log = this._injector.get<SdLogProvider>(SdLogProvider);
      await log.write({error: err.stack, type: "error"});

      const router = this._injector.get<Router>(Router);
      if (process.env.NODE_ENV === "production") {
        alert(`처리되지 않은 오류가 발생하였습니다.\r\n\r\n${err.message}`);
        console.error(err);
        await router.navigate(["/error", {message: err.message, stack: err.stack}]);
        /*location.reload();*/
      }
      else {
        console.error(err);
        await router.navigate(["/error", {message: err.message, stack: err.stack}]);
      }
    }
  }
}
