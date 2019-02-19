import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {
  IBarobillServiceGetAccountLogListParam,
  IBarobillServiceGetAccountLogParam,
  IBarobillServiceGetAccountLogResult,
  IBarobillServiceGetAccountLogResultItem,
  IBarobillServiceGetCardLogListParam,
  IBarobillServiceGetCardLogParam,
  IBarobillServiceGetCardLogResult,
  IBarobillServiceGetCardLogResultItem
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

  public async getCardLogListAsync(param: IBarobillServiceGetCardLogListParam): Promise<IBarobillServiceGetCardLogResultItem[]> {
    return await this._ws.sendAsync("BarobillService.getCardLogListAsync", [param]);
  }

  public async getAccountLogListAsync(param: IBarobillServiceGetAccountLogListParam): Promise<IBarobillServiceGetAccountLogResultItem[]> {
    return await this._ws.sendAsync("BarobillService.getAccountLogListAsync", [param]);
  }
}
