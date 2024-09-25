import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  //region styles
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-card {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      transition: box-shadow 0.3s ease-in-out;
      @include elevation(2);
      animation: sd-card  var(--animation-duration) ease-in;

      &:hover,
      &:has(:focus) {
        @include elevation(6);
      }

      @media all and (pointer: coarse) {
        @include elevation(0);

        &:hover,
        &:has(:focus) {
          @include elevation(0);
        }
      }
    }

    @keyframes sd-card {
      from {
        opacity: 0;
        transform: translateY(-1em);
      }
    }
  `],
  //endregion
  template: `
    <ng-content></ng-content>
  `,
})
export class SdCardControl {
}
