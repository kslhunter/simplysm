import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {Uuid} from "@simplism/sd-core";
import * as JsBarcode from "jsbarcode";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-barcode",
  template: `
    <canvas [attr.id]="uuid" *ngIf="value"></canvas>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdBarcodeControl}]
})
export class SdBarcodeControl extends SdComponentBase implements OnChanges {
  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public lineWidth = 1;

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public height = 48;

  @Input()
  @SdTypeValidate(String)
  public value?: string;

  public uuid = Uuid.newUuid().toString();

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.value) {
      JsBarcode(`#${this.uuid}`, this.value, {
        format: "code128",
        width: this.lineWidth,
        height: this.height,
        fontOptions: "bold",
        fontSize: this.lineWidth * 12
      });
    }
  }
}
