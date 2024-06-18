import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-content-box",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div [class]="contentClass" [style]="contentStyle">
      <ng-content/>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;

      > div {
        background: white;
        padding: var(--gap-lg);
      }

      &[sd-fill=true] {
        height: 100%;

        > div {
          height: 100%;
        }
      }

      &[sd-size=lg] {
        > div {
          padding: var(--gap-xl);
        }
      }

      body.sd-theme-modern &,
      body.sd-theme-kiosk &,
      body.sd-theme-mobile & {
        padding: var(--gap-xl);

        > div {
          border-radius: var(--border-radius-default);
          overflow: auto;
        }

        &:not([sd-fill=true]) {
          padding: 0;
          margin: var(--gap-xl);
        }

        &[sd-size=lg] {
          padding: var(--gap-xxl);

          &:not([sd-fill=true]) {
            padding: 0;
            margin: var(--gap-xxl);

            > div {
            }
          }
        }
      }

      body.sd-theme-modern & {
        > div {
          transition: box-shadow .3s ease-in-out;
          @include elevation(2);

          &:hover,
          &:has(:focus) {
            @include elevation(6);
          }
        }
      }

      /*body.sd-theme-kiosk &,
      body.sd-theme-mobile & {
        > div {
          @include elevation(0);

          &:hover,
          &:has(:focus) {
            @include elevation(0);
          }
        }
      }*/
    }
  `],
  host: {
    "[attr.sd-fill]": "fill",
    "[attr.sd-size]": "size"
  }
})
export class SdContentBoxControl {
  @Input({transform: coercionBoolean}) fill = false;
  @Input() contentStyle?: string;
  @Input() contentClass?: string;
  @Input() size?: "lg";
}