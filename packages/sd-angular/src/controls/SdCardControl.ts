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
      border-top: 3px solid var(--theme-color-primary-default);
      border-bottom: 1px solid var(--theme-color-primary-default);
      border-left: 1px solid var(--theme-color-grey-light);
      border-right: 1px solid var(--theme-color-grey-light);

      &[sd-elevation=none] {
        border-top-width: 0;
      }

      &[sd-elevation=lg] {
        border-top-width: 6px;
      }

      &[sd-elevation=xl] {
        border-top-width: 12px;
      }
    }
  `]
})
export class SdCardControl {
  @Input()
  @SdInputValidate({ type: String, includes: ["none", "lg", "xl"] })
  @HostBinding("attr.sd-elevation")
  public elevation?: "none" | "lg" | "xl";
}

