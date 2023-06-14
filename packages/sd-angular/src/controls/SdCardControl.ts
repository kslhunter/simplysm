import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      @include elevation(2);
      transition: box-shadow .1s ease-in-out;

      &:hover {
        @include elevation(6);
      }
    }
  `]
})
export class SdCardControl {
}

