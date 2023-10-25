import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      transition: box-shadow .3s ease-in-out;
      @include elevation(2);

      &:hover,
      &:has(:focus) {
        @include elevation(6);
      }

      @media all and (pointer: coarse) {
        @include elevation(0);
      }
    }
  `]
})
export class SdCardControl {
}

