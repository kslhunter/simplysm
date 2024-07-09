import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-topbar-nav",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-topbar-nav {
      display: inline-block;
      line-height: var(--topbar-height);
      min-width: var(--topbar-height);
      padding: 0 var(--gap-default);
      text-align: center;
      color: var(--text-trans-lighter);

      body.sd-theme-mobile &,
      body.sd-theme-kiosk &,
      body.sd-theme-modern & {
        @include active-effect(true);
      }
    }
  `]
})
export class SdTopbarNavControl {
}
