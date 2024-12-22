import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { useRipple } from "../utils/use-ripple";

@Component({
  selector: "sd-topbar-nav",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-topbar-nav {
        display: inline-block;
        line-height: var(--topbar-height);
        min-width: var(--topbar-height);
        padding: 0 var(--gap-default);
        text-align: center;
        color: var(--text-trans-lighter);
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
})
export class SdTopbarNavControl {
  constructor() {
    useRipple();
  }
}
