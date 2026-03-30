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
  template: `<ng-content />`,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/variables";
      @use "sass:map";

      sd-toast-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: map.get(variables.$vars, z-index, toast);
        pointer-events: none;

        @media all and (max-width: variables.$breakpoint-mobile) {
          flex-direction: column-reverse;
        }

        &[data-sd-overlap] {
          display: block;
          bottom: 0;
          height: 100%;

          > sd-toast {
            position: absolute;
            bottom: var(--gap-xxl);
            left: var(--gap-xxl);
            right: var(--gap-xxl);
            width: auto;
            max-width: none;
          }
        }
      }
    `,
  ],
})
export class SdToastContainerControl {
  overlap = input(false, { transform: booleanAttribute });
}
