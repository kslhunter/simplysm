import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import bwipjs from "bwip-js";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div [innerHTML]="_trustedSvgHtml()"></div>
  `,
})
export class SdBarcodeControl {
  private readonly _sanitizer = inject(DomSanitizer);

  type = input.required<TBarcodeType>();
  value = input<string>();

  // bwip-js는 바코드 데이터를 기하학적 SVG로 변환하는 신뢰할 수 있는 라이브러리이므로
  // bypassSecurityTrustHtml을 사용한다. 사용자 HTML은 전달되지 않는다.
  protected _trustedSvgHtml = computed(() => {
    const text = this.value();
    if (text == null || text === "") {
      return "";
    }
    const svg = bwipjs.toSVG({
      bcid: this.type(),
      text,
    });
    return this._sanitizer.bypassSecurityTrustHtml(svg);
  });
}

export type TBarcodeType =
  | "auspost" | "azteccode" | "azteccodecompact" | "aztecrune" | "bc412"
  | "channelcode" | "codablockf" | "code11" | "code128" | "code16k"
  | "code2of5" | "code32" | "code39" | "code39ext" | "code49" | "code93"
  | "code93ext" | "codeone" | "coop2of5" | "daft" | "databarexpanded"
  | "databarexpandedcomposite" | "databarexpandedstacked" | "databarexpandedstackedcomposite"
  | "databarlimited" | "databarlimitedcomposite" | "databaromni" | "databaromnicomposite"
  | "databarstacked" | "databarstackedcomposite" | "databarstackedomni" | "databarstackedomnicomposite"
  | "databartruncated" | "databartruncatedcomposite" | "datalogic2of5" | "datamatrix"
  | "datamatrixrectangular" | "datamatrixrectangularextension" | "dotcode" | "ean13"
  | "ean13composite" | "ean14" | "ean2" | "ean5" | "ean8" | "ean8composite" | "flattermarken"
  | "gs1-128" | "gs1-128composite" | "gs1-cc" | "gs1datamatrix" | "gs1datamatrixrectangular"
  | "gs1dldatamatrix" | "gs1dlqrcode" | "gs1dotcode" | "gs1northamericancoupon" | "gs1qrcode"
  | "hanxin" | "hibcazteccode" | "hibccodablockf" | "hibccode128" | "hibccode39" | "hibcdatamatrix"
  | "hibcdatamatrixrectangular" | "hibcmicropdf417" | "hibcpdf417" | "hibcqrcode" | "iata2of5"
  | "identcode" | "industrial2of5" | "interleaved2of5" | "isbn" | "ismn" | "issn" | "itf14"
  | "japanpost" | "kix" | "leitcode" | "mailmark" | "mands" | "matrix2of5" | "maxicode"
  | "micropdf417" | "microqrcode" | "msi" | "onecode" | "pdf417" | "pdf417compact"
  | "pharmacode" | "pharmacode2" | "planet" | "plessey" | "posicode" | "postnet" | "pzn"
  | "qrcode" | "rationalizedCodabar" | "raw" | "rectangularmicroqrcode" | "royalmail"
  | "sscc18" | "swissqrcode" | "symbol" | "telepen" | "telepennumeric" | "ultracode"
  | "upca" | "upcacomposite" | "upce" | "upcecomposite";
