import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation
} from "@angular/core";
import qrcode from "qrcode";
import {coercionNumber} from "../../utils/commons";

@Component({
  selector: "sd-qrcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <canvas #canvasEl></canvas>`
})
export class SdQrcodeControl {
  value = input.required<string>();
  scale = input(1, {transform: coercionNumber});

  canvasElRef = viewChild.required<any, ElementRef<HTMLCanvasElement>>("canvasEl", {read: ElementRef});

  constructor() {
    effect(async () => {
      await qrcode.toCanvas(this.canvasElRef().nativeElement, this.value(), {
        scale: this.scale()
      });
    });
  }
}
