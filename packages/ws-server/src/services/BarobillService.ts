import {SdWebSocketServiceBase} from "../SdWebSocketServiceBase";
import {SdWebSocketServerUtil} from "../SdWebSocketServerUtil";
import * as soap from "soap";
import {DateTime} from "@simplysm/common";
import {
  IBarobillServiceGetAccountLogParam,
  IBarobillServiceGetAccountLogResult,
  IBarobillServiceGetCardLogParam,
  IBarobillServiceGetCardLogResult
} from "@simplysm/barobill-common";

export class BarobillService extends SdWebSocketServiceBase {
  public async getCardLogAsync(param: IBarobillServiceGetCardLogParam): Promise<IBarobillServiceGetCardLogResult> {
    const result = await this._sendAsync("CARD", "GetCardLog", {
      CorpNum: param.brn.replace(/-/g, ""),
      ID: param.userId,
      CardNum: param.cardNumber.replace(/-/g, ""),
      BaseDate: param.doneAtDate.toFormatString("yyyyMMdd"),
      CountPerPage: param.itemLengthPerPage,
      CurrentPage: param.page + 1
    });

    if (Number(result["CurrentPage"]) < 0) {
      throw new Error(await this._getErrorString("CARD", Number(result["CurrentPage"])));
    }
    return {
      totalCount: result["MaxIndex"],
      pageCount: result["MaxPageNum"],
      items: result["CardLogList"] ? result["CardLogList"]["CardLog"].map((item: any) => ({
        approvalNumber: item["CardApprovalNum"],
        storeName: item["UseStoreName"],
        amount: Number(item["TotalAmount"]),
        doneAtDateTime: DateTime.parse(item["UseDT"])
      })) : []
    };
  }

  public async getAccountLogAsync(param: IBarobillServiceGetAccountLogParam): Promise<IBarobillServiceGetAccountLogResult> {
    const result = await this._sendAsync("BANKACCOUNT", "GetBankAccountLogEx", {
      CorpNum: param.brn.replace(/-/g, ""),
      ID: param.userId,
      BankAccountNum: param.accountNumber.replace(/-/g, ""),
      BaseDate: param.doneAtDate.toFormatString("yyyyMMdd"),
      CountPerPage: param.itemLengthPerPage,
      CurrentPage: param.page + 1,
      OrderDirection: 2
    });

    if (Number(result["CurrentPage"]) < 0) {
      throw new Error(await this._getErrorString("BANKACCOUNT", Number(result["CurrentPage"])));
    }

    return {
      totalCount: result["MaxIndex"],
      pageCount: result["MaxPageNum"],
      items: result["BankAccountLogList"] ? result["BankAccountLogList"]["BankAccountLogEx"].map((item: any) => ({
        key: item["TransRefKey"],
        type: Number(item["Deposit"]) - Number(item["Withdraw"]) > 0 ? "입금" : "출금",
        amount: Math.abs(Number(item["Deposit"]) - Number(item["Withdraw"])),
        doneAtDateTime: DateTime.parse(item["TransDT"]),
        content: item["TransRemark"]
      })) : []
    };
  }

  private async _getErrorString(target: "CARD" | "BANKACCOUNT", errorCode: number): Promise<string> {
    return await this._sendAsync(target, "GetErrString", {ErrCode: errorCode});
  }

  private async _sendAsync(target: "CARD" | "BANKACCOUNT", method: string, args: { [key: string]: any }): Promise<any> {
    const url = process.env.NODE_ENV === "production"
      ? `http://ws.baroservice.com/${target}.asmx?WSDL`
      : `http://testws.baroservice.com/${target}.asmx?WSDL`;

    const config = await SdWebSocketServerUtil.getConfigAsync(this.staticPath, this.request.url);
    const certKey = config["barobill"]["certKey"];

    const client = await soap.createClientAsync(url);
    const result = await client[method + "Async"]({
      CERTKEY: certKey,
      ...args
    });
    return result[0][method + "Result"];
  }
}