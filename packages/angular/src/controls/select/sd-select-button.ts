import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { setupRipple } from "../../core/ripple/setupRipple";

@Component({
  selector: "sd-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content /> `,
  styles: [
    /* language=SCSS */ `
      sd-select-button {
        display: block;
        background-color: var(--sd-bg-content);
        font-weight: bold;
        cursor: pointer;
        color: var(--sd-tx-primary);
        transition: background var(--sd-animation-duration) linear;

        &:hover {
          color: var(--sd-tx-primary-hover);
          background-color: var(--sd-bg-state-hover);
        }
      }
    `,
  ],
  host: {},
})
export class SdSelectButton {
  constructor() {
    setupRipple(() => true);
  }
}
