import {ErrorHandler, Injectable} from "@angular/core";

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  public handleError(error: any): void {
    const err = error.rejection ? error.rejection : error;

    if (!err.handled) {
      if (process.env.NODE_ENV === "production") {
        if (err.message && err.message.includes("웹 소켓이 연결되어있지 않습니다")) {
          alert("업데이트가 발생하여 자동으로 새로고침 됩니다.");
          location.reload();
        }
        else {
          alert(`처리되지 않은 오류가 발생하였습니다.\r\n\r\n${err.message}`);
          throw err;
        }
      }
      else {
        throw err;
      }
    }
  }
}
