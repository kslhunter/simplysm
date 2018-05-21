import {ErrorHandler, Injectable} from "@angular/core";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  public handleError(error: any): void {
    const err = error.rejection ? error.rejection : error;

    if (!err.handled) {
      if (process.env.NODE_ENV === "production") {
        alert(`처리되지 않은 오류가 발생하였습니다.\r\n\r\n${err.message}`);
        location.reload();
      }
      else {
        throw err;
      }
    }
  }
}
