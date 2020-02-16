import {ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

// tslint:disable-next-line:no-var-requires no-require-imports
require("jsbarcode");

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas></canvas>`
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

  @Input()
  @SdInputValidate(Number)
  public margin = 10;

  @Input()
  @SdInputValidate(Number)
  public fontSize?: number;

  public constructor(private readonly _elRef: ElementRef) {
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes) {
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
            fontSize: this.fontSize ? this.fontSize : (this.lineWidth * 12)
          }
        );
      }
    }
  }
}
