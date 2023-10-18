import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-nav",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: inline-block;
      line-height: var(--topbar-height);
      min-width: var(--topbar-height);
      padding: 0 var(--gap-default);
      text-align: center;
      color: var(--text-trans-lighter);

      @media all and (pointer: coarse) {
        @include active-effect(true);
      }
    }
  `]
})
export class SdTopbarNavControl {
}
