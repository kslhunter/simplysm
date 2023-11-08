import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      color: var(--text-trans-rev-dark);

      body.sd-theme-compact & {
        &:hover {
          background: var(--trans-default);
          color: var(--text-trans-rev-default);
        }
      }

      body.sd-theme-modern &,
      body.sd-theme-mobile &,
      body.sd-theme-kiosk & {
        color: var(--theme-primary-default);
        padding: 0 var(--gap-default);
        
        @include active-effect(true);
      }

      &[disabled=true] {
        pointer-events: none;
        opacity: .5;

        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          @include active-effect(false);
        }
      }
    }
  `]
})
export class SdTopbarMenuControl {
  @Input({transform: coercionBoolean})
  @HostBinding("attr.disabled")
  disabled = false;
}
