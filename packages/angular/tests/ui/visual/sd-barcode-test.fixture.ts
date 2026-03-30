import { Component, signal } from "@angular/core";
import type { TBarcodeType } from "../../../src/ui/visual/sd-barcode.control";
import { SdBarcodeControl } from "../../../src/ui/visual/sd-barcode.control";

@Component({
  selector: "sd-barcode-code128-test",
  template: `<sd-barcode [type]="'code128'" [value]="'12345'" />`,
  standalone: true,
  imports: [SdBarcodeControl],
})
export class SdBarcodeCode128Test {}

@Component({
  selector: "sd-barcode-qrcode-test",
  template: `<sd-barcode [type]="'qrcode'" [value]="'https://example.com'" />`,
  standalone: true,
  imports: [SdBarcodeControl],
})
export class SdBarcodeQrcodeTest {}

@Component({
  selector: "sd-barcode-change-test",
  template: `<sd-barcode [type]="type()" [value]="value()" />`,
  standalone: true,
  imports: [SdBarcodeControl],
})
export class SdBarcodeChangeTest {
  type = signal<TBarcodeType>("code128");
  value = signal("12345");
}

@Component({
  selector: "sd-barcode-no-value-test",
  template: `<sd-barcode [type]="'qrcode'" />`,
  standalone: true,
  imports: [SdBarcodeControl],
})
export class SdBarcodeNoValueTest {}
