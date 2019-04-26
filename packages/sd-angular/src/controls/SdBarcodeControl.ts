import { ChangeDetectionStrategy, Component, ElementRef, Input } from "@angular/core";
import { ISdNotifyPropertyChange, SdNotifyPropertyChange } from "../commons/SdNotifyPropertyChange";
import { SdTypeValidate } from "../commons/SdTypeValidate";

// tslint:disable-next-line:no-var-requires no-require-imports
require("jsbarcode");

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas></canvas>
  `
})
export class SdBarcodeControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate(String)
  @SdNotifyPropertyChange()
  public value?: string;

  @Input()
  @SdTypeValidate(String)
  @SdNotifyPropertyChange()
  public type = "code128";

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public lineWidth = 1;

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public height = 58;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {}

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (newValue) {
      const canvasEl = this._elRef.nativeElement.findAll("canvas")[0];

      if (canvasEl) {
        window["JsBarcode"](canvasEl, this.value, {
          format: this.type,
          width: this.lineWidth,
          height: this.height,
          fontOptions: "bold",
          fontSize: this.lineWidth * 12
        });
      }
    }
  }
}
