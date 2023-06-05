import {ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, ViewEncapsulation} from "@angular/core";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import * as QRCode from "qrcode";
import * as JsBarcode from "jsbarcode";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <canvas #canvas [style.display]="type !== 'qrcode' ? 'none' : undefined"></canvas>
    <svg #svg [style.display]="type === 'qrcode' ? 'none' : undefined"></svg>`
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

  @ViewChild("canvas", {static: true, read: ElementRef})
  public canvasElRef?: ElementRef<HTMLElement>;

  @ViewChild("svg", {static: true, read: ElementRef})
  public svgElRef?: ElementRef<HTMLElement>;

  public async sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): Promise<void> {
    if (newValue) {
      if (
        Boolean(this.canvasElRef) && Boolean(this.svgElRef) &&
        this.value !== undefined
      ) {
        if (this.type === "qrcode") {
          await QRCode.toCanvas(this.canvasElRef!.nativeElement, this.value || "", {
            scale: this.lineWidth
          });
        }
        else {
          console.log(this.value, this.type);

          JsBarcode(
            this.svgElRef!.nativeElement,
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
}
