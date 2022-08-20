import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { StringUtil } from "@simplysm/sd-core-common";

@Directive({
  selector: "[sdAnimate]"
})
export class SdAnimateDirective implements OnChanges {
  @Input()
  @SdInputValidate(Array)
  public sdAnimate?: [boolean, Record<string, string>, Record<string, string>];

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ("sdAnimate" in changes && this.sdAnimate) {
      const rootEl = this._elRef.nativeElement;
      if (this.sdAnimate[0]) {
        rootEl.style.transition = ".1s ease-out";
        rootEl.style.transitionProperty = Object.keys(this.sdAnimate[1]).map((item) => StringUtil.toKebabCase(item)).join(", ");
        Object.assign(
          rootEl.style,
          this.sdAnimate[1]
        );
      }
      else {
        rootEl.style.transition = ".1s ease-in";
        rootEl.style.transitionProperty = Object.keys(this.sdAnimate[2]).map((item) => StringUtil.toKebabCase(item)).join(", ");
        Object.assign(
          rootEl.style,
          this.sdAnimate[2]
        );
      }
    }
  }
}
