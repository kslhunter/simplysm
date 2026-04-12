import { Component, signal } from "@angular/core";
import type { BarcodeType } from "../../../src/features/visual/sd-barcode";
import { SdBarcode } from "../../../src/features/visual/sd-barcode";

@Component({
  selector: "sd-barcode-code128-test",
  template: `<sd-barcode [type]="'code128'" [value]="'12345'" />`,
  standalone: true,
  imports: [SdBarcode],
})
export class SdBarcodeCode128Test {}

@Component({
  selector: "sd-barcode-qrcode-test",
  template: `<sd-barcode [type]="'qrcode'" [value]="'https://example.com'" />`,
  standalone: true,
  imports: [SdBarcode],
})
export class SdBarcodeQrcodeTest {}

@Component({
  selector: "sd-barcode-change-test",
  template: `<sd-barcode [type]="type()" [value]="value()" />`,
  standalone: true,
  imports: [SdBarcode],
})
export class SdBarcodeChangeTest {
  type = signal<BarcodeType>("code128");
  value = signal("12345");
}

@Component({
  selector: "sd-barcode-no-value-test",
  template: `<sd-barcode [type]="'qrcode'" />`,
  standalone: true,
  imports: [SdBarcode],
})
export class SdBarcodeNoValueTest {}
