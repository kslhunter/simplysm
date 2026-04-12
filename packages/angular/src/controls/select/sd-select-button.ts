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
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        border-left: 1px solid var(--trans-lighter);
        position: relative;
        overflow: hidden;

        &:hover {
          background: var(--trans-lighter);
        }
      }
    `,
  ],
  host: {
    "[attr.tabindex]": "0",
  },
})
export class SdSelectButton {
  constructor() {
    setupRipple(() => true);
  }
}
