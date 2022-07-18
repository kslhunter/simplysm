import {ChangeDetectionStrategy, Component, ElementRef, Input, ViewEncapsulation} from "@angular/core";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import * as QRCode from "qrcode";

// tslint:disable-next-line:no-var-requires no-require-imports
require("jsbarcode");

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <canvas [style.display]="type !== 'qrcode' ? 'none' : undefined"></canvas>
    <svg [style.display]="type === 'qrcode' ? 'none' : undefined"></svg>`
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
  public margin = 10;

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public fontSize?: number;

  public constructor(private readonly _elRef: ElementRef) {
  }

  public async sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): Promise<void> {
    if (newValue) {
      if (this.type === "qrcode") {
        const canvasEl = (this._elRef.nativeElement as HTMLElement).findAll("canvas")[0];
        await QRCode.toCanvas(canvasEl, this.value || "", {
          scale: this.lineWidth
        });
      }
      else {
        const svgEl = this._elRef.nativeElement.findAll("svg")[0];
        window["JsBarcode"](
          svgEl,
          this.value,
          {
            margin: this.margin,
            format: this.type,
            width: this.lineWidth,
            height: this.height,
            fontOptions: "bold",
            fontSize: this.fontSize ? this.fontSize : (this.lineWidth * 12)
          }
        );
      }
    }
  }
}
