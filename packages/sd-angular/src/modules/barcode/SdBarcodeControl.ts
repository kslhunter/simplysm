import {ChangeDetectionStrategy, Component, ElementRef, Input, ViewEncapsulation} from "@angular/core";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

// tslint:disable-next-line:no-var-requires no-require-imports
require("jsbarcode");

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <canvas></canvas>`
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

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public fontSize = 12;

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public margin = 10;

  public constructor(private readonly _elRef: ElementRef) {
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (newValue) {
      const canvasEl = (this._elRef.nativeElement as HTMLElement).findAll("canvas")[0];

      if (canvasEl) {
        window["JsBarcode"](
          canvasEl,
          this.value,
          {
            margin: this.margin,
            format: this.type,
            width: this.lineWidth,
            height: this.height,
            fontOptions: "bold",
            fontSize: this.fontSize
          }
        );
      }
    }
  }
}
