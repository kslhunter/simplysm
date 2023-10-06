import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      color: var(--text-brightness-rev-dark);

      &:hover {
        background: var(--trans-brightness-default);
        color: var(--text-brightness-rev-default);
      }

      &[disabled=true] {
        pointer-events: none;
        opacity: .5;
      }
    }
  `]
})
export class SdTopbarMenuControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.disabled")
  public disabled?: boolean;
}
