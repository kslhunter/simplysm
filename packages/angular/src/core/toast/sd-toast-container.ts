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
        padding: var(--gap-xxl);
        z-index: map.get(variables.$vars, z-index, toast);

        @include mixins.flex-direction(column);

        @media all and (max-width: variables.$breakpoint-mobile) {
          flex-direction: column-reverse;
        }

        &[data-sd-overlap] {
          display: block;

          > sd-toast {
            position: absolute;
            bottom: var(--gap-xxl);
            left: var(--gap-xxl);
            right: var(--gap-xxl);
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
