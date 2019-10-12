import {Injectable} from "@angular/core";
import {DateOnly, DateTime} from "@simplysm/sd-core";
import {SdServiceProvider} from "../service/SdServiceProvider";
import {SdLogProvider} from "../shared/SdLogProvider";

@Injectable()
export class SdEasyPayProvider {
  public constructor(private readonly _service: SdServiceProvider,
                     private readonly _log: SdLogProvider) {
  }

  public async submit(request: ISdEasyPayRequest): Promise<ISdEasyPayResponse | undefined> {
    if (!document.getElementById("sd-easy-pay-script")) {
      await new Promise<void>(resolve => {
        const scriptEl = document.createElement("script");
        scriptEl.async = true;
        scriptEl.src = "http://testpg.easypay.co.kr/webpay/EasypayCard_Web.js";
        /*scriptEl.src = "https://pg.easypay.co.kr/webpay/EasypayCard_Web.js"*/
        scriptEl.setAttribute("id", "sd-easy-pay-script");

        scriptEl.onload = () => {
          resolve();
        };

        document.head!.appendChild(scriptEl);
      });
    }

    const formEl = document.createElement("form");
    document.body.appendChild(formEl);

    formEl.setAttribute("id", "sd-easy-pay-form");
    formEl.method = "post";
    this._setFormData(formEl, "EP_mall_id", request.mallId);
    this._setFormData(formEl, "EP_mall_nm", encodeURIComponent(request.mallName || ""));
    this._setFormData(formEl, "EP_order_no", request.orderNumber);
    this._setFormData(formEl, "EP_pay_type",
      request.payType === "신용카드" ? "11"
        : request.payType === "계좌이체" ? "21"
        : request.payType === "가상계좌" ? "22"
          : request.payType === "휴대폰" ? "31"
            : request.payType === "선불결제" ? "50"
              : request.payType === "간편결제" ? "60"
                : "81"
    );

    this._setFormData(formEl, "EP_currency", "00");
    this._setFormData(formEl, "EP_product_nm", encodeURIComponent(request.productName.replace(/&/g, "_")));
    this._setFormData(formEl, "EP_product_amt", request.productAmount.toString());
    this._setFormData(formEl, "EP_return_url", this._service.webUrl + "/_easy-pay");
    this._setFormData(formEl, "EP_lang_flag", "KOR");
    this._setFormData(formEl, "EP_charset", "UTF-8");
    this._setFormData(formEl, "EP_user_id", request.userId || "");
    this._setFormData(formEl, "EP_memb_user_no", request.userNumber || "");
    this._setFormData(formEl, "EP_user_nm", encodeURIComponent(request.userName || ""));
    this._setFormData(formEl, "EP_user_mail", request.userEmailAddress || "");
    this._setFormData(formEl, "EP_user_phone1", request.userPhone1 || "");
    this._setFormData(formEl, "EP_user_phone2", request.userPhone2 || "");
    this._setFormData(formEl, "EP_user_addr", request.userAddress || "");
    this._setFormData(formEl, "EP_product_type", request.productType === "실물" ? "0" : request.productType === "컨텐츠" ? "1" : "");
    this._setFormData(formEl, "EP_product_expr", request.serviceExpiryDate ? request.serviceExpiryDate.toFormatString("yyyyMMdd") : "");
    this._setFormData(formEl, "EP_window_type", "iframe");
    this._setFormData(formEl, "EP_disp_cash_yn", request.useCashReceipt === true ? "Y" : request.useCashReceipt === false ? "N" : "");

    if (request.virtualAccountExpiryDateTime) {
      this._setFormData(formEl, "EP_vacct_end_date", request.virtualAccountExpiryDateTime.toFormatString("yyyyMMdd"));
      this._setFormData(formEl, "EP_vacct_end_time", request.virtualAccountExpiryDateTime.toFormatString("HHmmss"));
    }

    await this._log.write({request, type: "info"});

    return await new Promise<ISdEasyPayResponse>(resolve => {
      // @ts-ignore
      easypay_webpay(formEl, "http://testpg.easypay.co.kr/webpay/MainAction.do", "hiddenifr", "", "", "iframe", "");

      // @ts-ignore
      const prevKiccPopupClose = kicc_popup_close;
      // @ts-ignore
      kicc_popup_close = () => {
        // @ts-ignore
        kicc_popup_close = prevKiccPopupClose;
        prevKiccPopupClose();

        const inputEl = window.document.getElementById("res_cd") as HTMLInputElement;
        if (!inputEl) {
          document.body.removeChild(formEl);
          resolve(undefined);
          return;
        }

        const payType = this._getFormData(formEl, "pay_type")!;
        const installmentMonths = this._getFormData(formEl, "install_period");
        const isInterestFree = this._getFormData(formEl, "noint");
        const canPartialCancel = this._getFormData(formEl, "part_cancel_yn");
        const cardBizType = this._getFormData(formEl, "card_biz_gubun");
        const accountExpiryDate = this._getFormData(formEl, "expire_date");
        const cashInvoiceApprovalDateTime = this._getFormData(formEl, "cash_tran_date");
        const cashInvoiceIssueReason = this._getFormData(formEl, "cash_issue_type");
        const cashInvoiceApprovalType = this._getFormData(formEl, "cash_auth_type");
        const prepaymentRemainedAmount = this._getFormData(formEl, "rem_amt");
        const result: ISdEasyPayResponse = {
          resultCode: this._getFormData(formEl, "res_cd")!,
          resultMessage: this._getFormData(formEl, "res_msg")!,
          invoiceNumber: this._getFormData(formEl, "cno")!,
          amount: Number.parseInt(this._getFormData(formEl, "amount")!, 10),
          orderNumber: this._getFormData(formEl, "order_no")!,
          approvalNumber: this._getFormData(formEl, "auth_no")!,
          approvalDateTime: DateTime.parse(this._getFormData(formEl, "tran_date")!),
          useEscrow: this._getFormData(formEl, "escrow_yn")! === "Y",
          statusCode: this._getFormData(formEl, "stat_cd")!,
          statusMessage: this._getFormData(formEl, "stat_msg")!,
          payType: payType === "11" ? "신용카드"
            : payType === "21" ? "계좌이체"
              : payType === "22" ? "가상계좌"
                : payType === "31" ? "휴대폰"
                  : payType === "50" ? "선불결제"
                    : "간편결제",
          mallId: this._getFormData(formEl, "memb_id")!,
          cardNumber: this._getFormData(formEl, "card_no"),
          issuerCode: this._getFormData(formEl, "issuer_cd"),
          issuerName: this._getFormData(formEl, "issuer_nm"),
          acquirerCode: this._getFormData(formEl, "acquirer_cd"),
          acquirerName: this._getFormData(formEl, "acquirer_nm"),
          installmentMonths: installmentMonths ? Number.parseInt(installmentMonths, 10) : undefined,
          interestFreeType: isInterestFree === "00" ? "일반거래"
            : isInterestFree === "02" ? "가맹점"
              : isInterestFree === "03" ? "이벤트"
                : undefined,
          canPartialCancel: canPartialCancel === "Y" ? true : canPartialCancel === "N" ? false : undefined,
          cardBizType: cardBizType === "P" ? "개인" : cardBizType === "C" ? "법인" : cardBizType === "N" ? "기타" : undefined,
          bankCode: this._getFormData(formEl, "bank_cd"),
          bankName: this._getFormData(formEl, "bank_nm"),
          accountNumber: this._getFormData(formEl, "account_no"),
          accountDepositName: this._getFormData(formEl, "deposit_nm"),
          accountExpiryDateTime: accountExpiryDate ? DateTime.parse(accountExpiryDate) : undefined,
          cashInvoiceResultCode: this._getFormData(formEl, "cach_res_cd"),
          cashInvoiceResultMessage: this._getFormData(formEl, "cash_res_msg"),
          cashInvoiceApprovalNumber: this._getFormData(formEl, "cash_auth_no"),
          cashInvoiceApprovalDateTime: cashInvoiceApprovalDateTime ? DateTime.parse(cashInvoiceApprovalDateTime) : undefined,
          cashInvoiceIssueReason: cashInvoiceIssueReason === "01" ? "소득공제" : cashInvoiceIssueReason === "02" ? "지출증빙" : undefined,
          cashInvoiceApprovalType: cashInvoiceApprovalType === "2" ? "주민번호"
            : cashInvoiceApprovalType === "3" ? "휴대폰번호"
              : cashInvoiceApprovalType === "4" ? "사업자번호"
                : undefined,
          cashInvoiceApprovalValue: this._getFormData(formEl, "cash_auth_value"),
          phoneId: this._getFormData(formEl, "auth_id"),
          phoneApprovalNumber: this._getFormData(formEl, "billid"),
          phoneNumber: this._getFormData(formEl, "mobile_no"),
          prepaymentIssuerCode: this._getFormData(formEl, "cp_cd"),
          prepaymentRemainedAmount: prepaymentRemainedAmount ? Number.parseInt(prepaymentRemainedAmount, 10) : undefined
        };

        document.body.removeChild(formEl);
        resolve(result);
      };
    });
  }

  private _setFormData(formEl: HTMLFormElement, key: string, value: string): void {
    let inputEl = window.document.getElementById(key) as HTMLInputElement;
    if (!inputEl) {
      inputEl = document.createElement("input");
      inputEl.type = "hidden";
      inputEl.name = key;
      inputEl.setAttribute("id", key);
      formEl.appendChild(inputEl);
    }

    inputEl.value = value;
  }

  private _getFormData(formEl: HTMLFormElement, key: string): string | undefined {
    const inputEl = window.document.getElementById(key) as HTMLInputElement;
    if (!inputEl) {
      return undefined;
    }

    return inputEl.value || undefined;
  }
}

export interface ISdEasyPayRequest {
  // 가맹점 ID
  mallId: string;
  // 가맹점명
  mallName?: string;
  // 가맹점 주문번호
  orderNumber: string;
  // 결제수단
  payType: SdEasyPayRequestPayType;
  // 상품명
  productName: string;
  // 상품금액
  productAmount: number;
  // 가맹점 고객 ID
  userId?: string;
  // 가맹점 고객 일련번호
  userNumber?: string;
  // 가맹점 고객명
  userName?: string;
  // 가맹점 고객 이메일 주소
  userEmailAddress?: string;
  // 가맹점 고객 전화번호
  userPhone1?: string;
  // 가맹점 고객 전화번호2
  userPhone2?: string;
  // 가맹점 고객 주소
  userAddress?: string;
  // 상품정보구분
  productType?: SdEasyPayRequestProductType;
  // 서비스 만료일자
  serviceExpiryDate?: DateOnly;
  // 현금영수증 화면표시 여부
  useCashReceipt?: boolean;

  //-- 신용카드

  //-- 가상계좌 설정
  // 가상계좌 만료일자
  virtualAccountExpiryDateTime?: DateTime;

  //-- 선불카드
}

export interface ISdEasyPayResponse {
  // 응답코드
  resultCode: string;
  // 응답메시지
  resultMessage: string;
  // PG거래번호(KICC 부여번호)
  invoiceNumber: string;
  // 총 결제금액
  amount: number;
  // 주문번호(가맹점 부여번호)
  orderNumber: string;
  // 승인번호
  approvalNumber: string;
  // 거래일시(승인일시)
  approvalDateTime: DateTime;
  // 에스크로 사용유무
  useEscrow: boolean;
  // 상태코드
  statusCode: string;
  // 상태메시지
  statusMessage: string;
  // 결제수단
  payType: SdEasyPayRequestPayType;
  // 가맹점 Mall ID
  mallId: string;
  // 카드번호
  cardNumber?: string;
  // 카드 발급사코드
  issuerCode?: string;
  // 카드 발급사명
  issuerName?: string;
  // 매입사코드
  acquirerCode?: string;
  // 매입사명
  acquirerName?: string;
  // 할부개월
  installmentMonths?: number;
  // 무이자 구분
  interestFreeType?: "일반거래" | "가맹점" | "이벤트";
  // 부분취소 가능여부
  canPartialCancel?: boolean;
  // 신용카드 구분
  cardBizType?: "개인" | "법인" | "기타";
  // 은행코드
  bankCode?: string;
  // 은행명
  bankName?: string;
  // 계좌번호
  accountNumber?: string;
  // 계좌예금주성명
  accountDepositName?: string;
  // 계좌사용만료일시
  accountExpiryDateTime?: DateTime;
  // 현금영수증 결과코드
  cashInvoiceResultCode?: string;
  // 현금영수증 결과메세지
  cashInvoiceResultMessage?: string;
  // 현금영수증 승인번호
  cashInvoiceApprovalNumber?: string;
  // 현금영수증 승인일시
  cashInvoiceApprovalDateTime?: DateTime;
  // 현금영수증발행용도
  cashInvoiceIssueReason?: "소득공제" | "지출증빙";
  // 인증구분
  cashInvoiceApprovalType?: "주민번호" | "휴대폰번호" | "사업자번호";
  // 인증번호
  cashInvoiceApprovalValue?: string;
  // PhoneID
  phoneId?: string;
  // 인증번호
  phoneApprovalNumber?: string;
  // 휴대폰번호
  phoneNumber?: string;
  // 포인트사/쿠폰사
  prepaymentIssuerCode?: string;
  // 잔액
  prepaymentRemainedAmount?: number;
}

export type SdEasyPayRequestPayType = "신용카드" | "계좌이체" | "가상계좌" | "휴대폰" | "선불결제" | "간편결제" | "배치인증";
export type SdEasyPayRequestProductType = "실물" | "컨텐츠";