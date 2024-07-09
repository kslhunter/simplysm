import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-topbar-menu {
      display: inline-block;
      cursor: pointer;

      body.sd-theme-compact & {
        padding: 0 var(--gap-lg);
        color: var(--text-trans-rev-dark);
        line-height: var(--topbar-height);

        &:hover {
          background: var(--trans-default);
          color: var(--text-trans-rev-default);
        }
      }

      body.sd-theme-modern &,
      body.sd-theme-kiosk & {
        color: var(--theme-primary-default);
        padding: var(--gap-sm) var(--gap-default);
        //background: var(--theme-primary-lightest);
        border-radius: var(--border-radius-default);
        transition: background .1s linear;

        @include active-effect(true);

        &:hover {
          //background: var(--theme-primary-lighter);
          background: var(--theme-primary-lightest);
        }
      }

      body.sd-theme-mobile & {
        color: var(--theme-primary-default);
        line-height: var(--line-height);
        padding: var(--gap-default) var(--gap-lg);
        transition: background .1s linear;

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
  `],
  host: {
    "[attr.disabled]": "disabled"
  }
})
export class SdTopbarMenuControl {
  @Input({transform: coercionBoolean}) disabled = false;
}
