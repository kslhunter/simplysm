import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    
    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      color: var(--text-trans-rev-dark);

      @media all and (hover: none) and (pointer: coarse) {
        @include mobile-active-effect(true);
      }

      &:hover {
        background: var(--trans-default);
        color: var(--text-trans-rev-default);
      }

      &[disabled=true] {
        pointer-events: none;
        opacity: .5;

        @media all and (hover: none) and (pointer: coarse) {
          @include mobile-active-effect(false);
        }
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
