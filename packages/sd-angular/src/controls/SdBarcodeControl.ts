import {ChangeDetectionStrategy, Component, DoCheck, ElementRef, inject, Injector, Input} from "@angular/core";
import jsbarcode from "jsbarcode";
import qrcode from "qrcode";
import {CommonModule} from "@angular/common";
import {coercionNumber} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas [hidden]="!value" [style.display]="type !== 'qrcode' ? 'none' : undefined"></canvas>
    <svg [hidden]="!value" [style.display]="type === 'qrcode' ? 'none' : undefined"
         [style.margin-bottom]="'-5px'"></svg>`
})
export class SdBarcodeControl implements DoCheck {
  @Input()
  value?: string;

  @Input()
  type = "code128";

  @Input({transform: coercionNumber})
  lineWidth = 1;

  @Input({transform: coercionNumber})
  height = 58;

  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(async run => {
      await run({
        value: [this.value],
        type: [this.type],
        lineWidth: [this.lineWidth],
        height: [this.height]
      }, async () => {
        if (this.value == null) return;

        if (this.type === "qrcode") {
          const canvasEl = this.#elRef.nativeElement.findFirst<HTMLCanvasElement>("> canvas");

          await qrcode.toCanvas(canvasEl, this.value ?? "", {
            scale: this.lineWidth
          });

          /*svgEl.outerHTML = await qrcode.toString(this.value ?? "", {
            type: "svg",
            scale: this.lineWidth
          });*/
        }
        else {
          const svgEl = this.#elRef.nativeElement.findFirst<SVGElement>("> svg");

          jsbarcode(
            svgEl,
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
      });
    });
  }
}
