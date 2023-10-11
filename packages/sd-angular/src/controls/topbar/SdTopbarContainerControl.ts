import {ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      position: relative;
      height: 100%;

      &[sd-size="sm"] {
        padding-top: var(--topbar-height-sm);
      }

      &[sd-size="lg"] {
        padding-top: var(--topbar-height-lg);
      }
    }
  `]
})
export class SdTopbarContainerControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  public constructor(public readonly elRef: ElementRef) {
  }
}
