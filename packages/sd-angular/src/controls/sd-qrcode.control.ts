import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import qrcode from "qrcode";
import { $effect } from "../utils/hooks/hooks";

@Component({
  selector: "sd-qrcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <canvas #canvasEl></canvas> `
})
export class SdQrcodeControl {
  value = input<string>();
  scale = input(1);

  canvasElRef = viewChild.required<any, ElementRef<HTMLCanvasElement>>("canvasEl", { read: ElementRef });

  constructor() {
    $effect([this.canvasElRef, this.value, this.scale], async () => {
      await qrcode.toCanvas(this.canvasElRef().nativeElement, this.value() ?? "", {
        scale: this.scale()
      });
    });
  }
}