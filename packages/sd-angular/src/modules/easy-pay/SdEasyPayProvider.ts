import {Injectable} from "@angular/core";
import {DateOnly, DateTime} from "@simplysm/sd-core";
import {SdServiceProvider} from "../service/SdServiceProvider";

@Injectable()
export class SdEasyPayProvider {
  public constructor(private readonly _service: SdServiceProvider) {
  }

  public async submit(request: ISdEasyPayRequest): Promise<void> {
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
    this._setFormData(formEl, "EP_product_nm", encodeURIComponent(request.productName));
    this._setFormData(formEl, "EP_product_amt", request.productAmount.toString());
    this._setFormData(formEl, "EP_return_url", this._service.webUrl + "/_easy-pay");
    this._setFormData(formEl, "EP_lang_flag", "KOR");
    this._setFormData(formEl, "EP_charset", "UTF-8");
    this._setFormData(formEl, "EP_user_id", request.userId || "");
    this._setFormData(formEl, "EP_memb_user_no", request.userNumber || "");
    this._setFormData(formEl, "EP_user_nm", encodeURIComponent(request.userName || ""));
    this._setFormData(formEl, "EP_user_mail", encodeURIComponent(request.userEmailAddress || ""));
    this._setFormData(formEl, "EP_user_phone1", request.userPhone1 || "");
    this._setFormData(formEl, "EP_user_phone2", request.userPhone2 || "");
    this._setFormData(formEl, "EP_user_addr", request.userAddress || "");
    this._setFormData(formEl, "EP_product_type", "0");
    this._setFormData(formEl, "EP_product_expr", request.serviceExpiryDate ? request.serviceExpiryDate.toFormatString("yyyyMMdd") : "");

    if (request.virtualAccountExpiryDateTime) {
      this._setFormData(formEl, "EP_vacct_end_date", request.virtualAccountExpiryDateTime.toFormatString("yyyyMMdd"));
      this._setFormData(formEl, "EP_vacct_end_time", request.virtualAccountExpiryDateTime.toFormatString("HHmmss"));
    }

    document.body.appendChild(formEl);
    // @ts-ignore
    easypay_webpay(formEl, "http://testpg.easypay.co.kr/webpay/MainAction.do", "hiddenifr", "", "", "iframe", "");

    console.log("!!");
  }

  private _setFormData(formEl: HTMLFormElement, key: string, value: string): void {
    let inputEl = formEl.findAll("> input[name=" + key + "]")[0] as HTMLInputElement;
    if (!inputEl) {
      inputEl = document.createElement("input");
      inputEl.type = "hidden";
      inputEl.name = key;
      formEl.appendChild(inputEl);
    }

    inputEl.value = value;
  }
}

export interface ISdEasyPayRequest {
  //-- 일반 요청
  // 가맹점 ID
  mallId: string;
  // 가맹점명
  mallName?: string;
  // 가맹점 주문번호
  orderNumber: string;
  // 결제수단
  payType: "신용카드" | "계좌이체" | "가상계좌" | "휴대폰" | "선불결제" | "간편결제" | "배치인증";
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
  // 서비스 만료일자
  serviceExpiryDate?: DateOnly;

  //-- 신용카드

  //-- 가상계좌 설정
  // 가상계좌 만료일자
  virtualAccountExpiryDateTime?: DateTime;

  //-- 선불카드
}