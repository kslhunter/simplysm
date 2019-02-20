import {SdWebSocketServiceBase} from "../SdWebSocketServiceBase";
import {SdWebSocketServerUtil} from "../SdWebSocketServerUtil";
import * as soap from "soap";
import {DateTime, JsonConvert, Logger} from "@simplysm/common";
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

export class BarobillService extends SdWebSocketServiceBase {
  private readonly _logger = new Logger("@simplysm/ws-server", "BarobillService");

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
        cardNumber: param.cardNumber,
        approvalNumber: item["CardApprovalNum"],
        storeName: item["UseStoreName"],
        amount: Number(item["CardApprovalCost"]),
        tax: Number(item["Tax"]),
        doneAtDateTime: DateTime.parse(item["UseDT"]),
        approvalType: item["CardApprovalType"]
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
        accountNumber: param.accountNumber,
        type: Number(item["Deposit"]) - Number(item["Withdraw"]) > 0 ? "입금" : "출금",
        amount: Math.abs(Number(item["Deposit"]) - Number(item["Withdraw"])),
        doneAtDateTime: DateTime.parse(item["TransDT"]),
        content: item["TransRemark"],
        transType: item["TransType"]
      })) : []
    };
  }

  public async getAccountLogListAsync(param: IBarobillServiceGetAccountLogListParam): Promise<IBarobillServiceGetAccountLogResultItem[]> {
    const result: IBarobillServiceGetAccountLogResultItem[] = [];

    const promiseList: Promise<void>[] = [];
    for (const accountNumber of param.accountNumbers) {
      for (let doneAtDate = param.fromDoneAtDate; doneAtDate.tick <= param.toDoneAtDate.tick; doneAtDate = doneAtDate.addDays(1)) {
        promiseList.push(new Promise<void>(async (resolve, reject) => {
          try {
            let currentPage = 0;
            while (true) {
              const currentResult = await this.getAccountLogAsync({
                brn: param.brn,
                userId: param.userId,
                accountNumber,
                doneAtDate,
                itemLengthPerPage: 100,
                page: currentPage
              });

              if (currentPage >= currentResult.pageCount) {
                break;
              }

              result.pushRange(currentResult.items);

              currentPage++;
            }
            resolve();
          }
          catch (err) {
            reject(err);
          }
        }));
      }
    }

    await Promise.all(promiseList);
    return result.orderBy(item => item.doneAtDateTime, true);
  }

  public async getCardLogListAsync(param: IBarobillServiceGetCardLogListParam): Promise<IBarobillServiceGetCardLogResultItem[]> {
    const result: IBarobillServiceGetCardLogResultItem[] = [];

    const promiseList: Promise<void>[] = [];
    for (const cardNumber of param.cardNumbers) {
      for (let doneAtDate = param.fromDoneAtDate; doneAtDate.tick <= param.toDoneAtDate.tick; doneAtDate = doneAtDate.addDays(1)) {
        promiseList.push(new Promise<void>(async (resolve, reject) => {
          try {
            let currentPage = 0;
            while (true) {
              const currentResult = await this.getCardLogAsync({
                brn: param.brn,
                userId: param.userId,
                cardNumber,
                doneAtDate,
                itemLengthPerPage: 100,
                page: currentPage
              });

              if (currentPage >= currentResult.pageCount) {
                break;
              }

              result.pushRange(currentResult.items);

              currentPage++;
            }
            resolve();
          }
          catch (err) {
            reject(err);
          }
        }));
      }
    }

    await Promise.all(promiseList);
    return result.orderBy(item => item.doneAtDateTime, true);
  }

  private async _getErrorString(target: "CARD" | "BANKACCOUNT", errorCode: number): Promise<string> {
    return await this._sendAsync(target, "GetErrString", {ErrCode: errorCode});
  }

  private async _sendAsync(target: "CARD" | "BANKACCOUNT", method: string, args: { [key: string]: any }): Promise<any> {
    const config = await SdWebSocketServerUtil.getConfigAsync(this.staticPath, this.request.url);
    const host = config["barobill"]["host"];
    const certKey = config["barobill"]["certKey"];

    const url = `http://${host}/${target}.asmx?WSDL`;

    this._logger.log(`바로빌 명령 전달 : ${target}.${method} - ${JsonConvert.stringify({CERTKEY: certKey, ...args})}`);

    const client = await soap.createClientAsync(url);
    const result = await client[method + "Async"]({
      CERTKEY: certKey,
      ...args
    });

    this._logger.log(`바로빌 결과 반환 : ${target}.${method} - ${JsonConvert.stringify(result[0][method + "Result"])}`);
    return result[0][method + "Result"];
  }
}