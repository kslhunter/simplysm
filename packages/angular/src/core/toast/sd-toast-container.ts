import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    "[attr.data-sd-overlap]": "overlap() || undefined",
  },
  template: "",
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";
      @use "sass:map";

      sd-toast-container {
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        pointer-events: none;
        padding: var(--sd-gap-xxl);
        z-index: map.get(variables.$sd, z, toast);

        @include mixins.flex-direction(column);

        @media all and (max-width: variables.$breakpoint-mobile) {
          flex-direction: column-reverse;
        }

        &[data-sd-overlap] {
          display: block;

          > sd-toast {
            position: absolute;
            bottom: var(--sd-gap-xxl);
            left: var(--sd-gap-xxl);
            right: var(--sd-gap-xxl);
            width: auto;
          }
        }
      }
    `,
  ],
})
export class SdToastContainer {
  overlap = input(false, { transform: booleanAttribute });
}
