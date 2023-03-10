import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

import jsbarcode from "jsbarcode";
import qrcode from "qrcode";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas [hidden]="!value" [style.margin-bottom]="type === 'qrcode' ? undefined : '-5px'"></canvas>`
})
export class SdBarcodeControl implements OnChanges {
  @Input()
  @SdInputValidate(String)
  public value?: string;

  @Input()
  @SdInputValidate(String)
  public type = "code128";

  @Input()
  @SdInputValidate(Number)
  public lineWidth = 1;

  @Input()
  @SdInputValidate(Number)
  public height = 58;

  public constructor(private readonly _elRef: ElementRef) {
  }

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (Object.keys(changes).length > 0) {
      if (this.value !== undefined) {
        const canvasEl = (this._elRef.nativeElement as HTMLElement).findFirst("> canvas") as HTMLCanvasElement;

        if (this.type === "qrcode") {
          await qrcode.toCanvas(canvasEl, this.value || "", {
            scale: this.lineWidth
          });
        }
        else {
          jsbarcode(
            canvasEl,
            this.value,
            {
              margin: 0,
              format: this.type,
              width: this.lineWidth,
              height: this.height,
              displayValue: false
            }
          );
        }
      }
    }
  }
}
