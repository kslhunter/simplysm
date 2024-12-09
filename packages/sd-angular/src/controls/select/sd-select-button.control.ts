import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { useRipple } from "../../utils/useRipple";

@Component({
  selector: "sd-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

      sd-select-button {
        display: block;
        background: white;
        font-weight: bold;
        cursor: pointer;
        color: var(--theme-primary-default);

        transition: background 0.1s linear;

        &:hover {
          color: var(--theme-primary-darker);
          background: var(--theme-grey-lightest);
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content> `,
})
export class SdSelectButtonControl {
  constructor() {
    useRipple();
  }
}
