import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import bwipjs from "bwip-js";
import { $effect } from "../utils/hooks/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";

@Component({
  selector: "sd-barcode2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
})
export class SdBarcode2Control {
  _elRef = injectElementRef<HTMLElement>();

  type = input.required<TBarcodeType>();
  value = input<string>();

  constructor() {
    $effect(() => {
      this._elRef.nativeElement.innerHTML = bwipjs.toSVG({
        bcid: this.type(),
        text: this.value() ?? "",
      });
    });
  }
}

type TBarcodeType =
  | "auspost"
  | "azteccode"
  | "azteccodecompact"
  | "aztecrune"
  | "bc412"
  | "channelcode"
  | "codablockf"
  | "code11"
  | "code128"
  | "code16k"
  | "code2of5"
  | "code32"
  | "code39"
  | "code39ext"
  | "code49"
  | "code93"
  | "code93ext"
  | "codeone"
  | "coop2of5"
  | "daft"
  | "databarexpanded"
  | "databarexpandedcomposite"
  | "databarexpandedstacked"
  | "databarexpandedstackedcomposite"
  | "databarlimited"
  | "databarlimitedcomposite"
  | "databaromni"
  | "databaromnicomposite"
  | "databarstacked"
  | "databarstackedcomposite"
  | "databarstackedomni"
  | "databarstackedomnicomposite"
  | "databartruncated"
  | "databartruncatedcomposite"
  | "datalogic2of5"
  | "datamatrix"
  | "datamatrixrectangular"
  | "datamatrixrectangularextension"
  | "dotcode"
  | "ean13"
  | "ean13composite"
  | "ean14"
  | "ean2"
  | "ean5"
  | "ean8"
  | "ean8composite"
  | "flattermarken"
  | "gs1-128"
  | "gs1-128composite"
  | "gs1-cc"
  | "gs1datamatrix"
  | "gs1datamatrixrectangular"
  | "gs1dldatamatrix"
  | "gs1dlqrcode"
  | "gs1dotcode"
  | "gs1northamericancoupon"
  | "gs1qrcode"
  | "hanxin"
  | "hibcazteccode"
  | "hibccodablockf"
  | "hibccode128"
  | "hibccode39"
  | "hibcdatamatrix"
  | "hibcdatamatrixrectangular"
  | "hibcmicropdf417"
  | "hibcpdf417"
  | "hibcqrcode"
  | "iata2of5"
  | "identcode"
  | "industrial2of5"
  | "interleaved2of5"
  | "isbn"
  | "ismn"
  | "issn"
  | "itf14"
  | "japanpost"
  | "kix"
  | "leitcode"
  | "mailmark"
  | "mands"
  | "matrix2of5"
  | "maxicode"
  | "micropdf417"
  | "microqrcode"
  | "msi"
  | "onecode"
  | "pdf417"
  | "pdf417compact"
  | "pharmacode"
  | "pharmacode2"
  | "planet"
  | "plessey"
  | "posicode"
  | "postnet"
  | "pzn"
  | "qrcode"
  | "rationalizedCodabar"
  | "raw"
  | "rectangularmicroqrcode"
  | "royalmail"
  | "sscc18"
  | "swissqrcode"
  | "symbol"
  | "telepen"
  | "telepennumeric"
  | "ultracode"
  | "upca"
  | "upcacomposite"
  | "upce"
  | "upcecomposite";