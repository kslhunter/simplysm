import { ChangeDetectionStrategy, Component, ElementRef, Input } from "@angular/core";

require("jsbarcode");

@Component({
  selector: "sd-barcode",
  template: `
        <canvas></canvas>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdBarcodeControl {
  @Input() public type = "code128";
  @Input() public width = 1;
  @Input() public height = 58;

  @Input()
  public set value(value: string) {
    if (value) {
      const $canvas = $(this._elementRef.nativeElement).find("canvas");
      $canvas["JsBarcode"](
        value,
        {
          format: this.type,
          width: this.width,
          height: this.height,
          fontOptions: "bold",
          fontSize: this.width * 12
        }
      );
    }
  }

  public constructor(private _elementRef: ElementRef) {
  }
}