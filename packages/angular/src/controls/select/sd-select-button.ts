import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";
import { setupRipple } from "../../core/ripple/setupRipple";

@Component({
  selector: "sd-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-select-button {
        display: block;
        background: var(--control-color);
        font-weight: bold;
        cursor: pointer;
        color: var(--theme-primary-default);
        transition: background var(--animation-duration) linear;

        &:hover {
          color: var(--theme-primary-darker);
          background: var(--theme-gray-lightest);
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
