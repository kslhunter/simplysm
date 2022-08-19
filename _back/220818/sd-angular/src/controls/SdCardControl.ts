import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      display: block;
      background: white;
      border-radius: var(--border-radius-xl);
      overflow: hidden;
      @include elevation(4);

      &[sd-elevation=none] {
        @include elevation(0);
      }
      
      &[sd-elevation=sm] {
        @include elevation(2);
      }

      &[sd-elevation=lg] {
        @include elevation(8);
      }

      &[sd-elevation=xl] {
        @include elevation(16);
      }
    }
  `]
})
export class SdCardControl {
  @Input()
  @SdInputValidate({ type: String, includes: ["none", "sm", "lg", "xl"] })
  @HostBinding("attr.sd-elevation")
  public elevation?: "none" | "sm" | "lg" | "xl";
}

