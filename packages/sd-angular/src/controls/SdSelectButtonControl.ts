import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select-button {
        display: block;
        background: white;
        font-weight: bold;
        cursor: pointer;
        color: var(--theme-primary-default);

        @include active-effect(true);
        transition: background 0.1s linear;

        &:hover {
          color: var(--theme-primary-darker);
          background: var(--theme-grey-lightest);
        }
      }
    `,
  ],
})
export class SdSelectButtonControl {}
