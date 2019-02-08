import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {
  IBarobillServiceGetAccountLogParam,
  IBarobillServiceGetAccountLogResult,
  IBarobillServiceGetCardLogParam,
  IBarobillServiceGetCardLogResult
} from "@simplysm/barobill-common";

@Injectable()
export class SdBarobillProvider {
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async getCardLogAsync(param: IBarobillServiceGetCardLogParam): Promise<IBarobillServiceGetCardLogResult> {
    return await this._ws.sendAsync("BarobillService.getCardLogAsync", [param]);
  }

  public async getAccountLogAsync(param: IBarobillServiceGetAccountLogParam): Promise<IBarobillServiceGetAccountLogResult> {
    return await this._ws.sendAsync("BarobillService.getAccountLogAsync", [param]);
  }
}
