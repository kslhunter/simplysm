import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, ViewEncapsulation } from "@angular/core";
import qrcode from "qrcode";
import { coercionNumber } from "../utils/commons";
import { sdCheck } from "../utils/hooks";

@Component({
  selector: "sd-qrcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <canvas #canvasEl></canvas> `,
})
export class SdQrcodeControl {
  @Input() value?: string;
  @Input({ transform: coercionNumber }) scale = 1;

  @ViewChild("canvasEl") canvasElRef!: ElementRef<HTMLCanvasElement>;

  constructor() {
    sdCheck.outside(
      () => ({
        value: [this.value],
        scale: [this.scale],
      }),
      async () => {
        await qrcode.toCanvas(this.canvasElRef.nativeElement, this.value ?? "", {
          scale: this.scale,
        });
      },
    );
  }
}
