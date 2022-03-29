import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;

      &[sd-elevation=true] {
        @include elevation(8);
      }
    }
  `]
})
export class SdCardControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-elevation")
  public elevation?: boolean;
}

