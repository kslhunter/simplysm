import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdSidebarContainer } from "./sd-sidebar-container";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-toggle]": "toggle()",
  },
  template: ` <ng-content /> `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";
      @use "../../../scss/commons/variables";

      sd-sidebar {
        position: absolute;
        z-index: var(--sd-z-sidebar);
        top: 0;
        left: 0;
        width: var(--sd-sidebar-width);
        height: 100%;
        background-color: var(--sd-bg-canvas);
        border-right: 1px solid var(--sd-bd-soft);

        @media not all and (max-width: variables.$breakpoint-mobile) {
          transition: transform var(--sd-animation-duration) ease-out;

          &[data-sd-toggle="true"] {
            transform: translateX(-100%);
            transition: transform var(--sd-animation-duration) ease-in;
          }
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          transition: transform var(--sd-animation-duration) ease-in;
          transform: translateX(-100%);

          &[data-sd-toggle="true"] {
            transform: none;
            transition: transform var(--sd-animation-duration) ease-out;
            @include mixins.elevation(16);
          }
        }
      }
    `,
  ],
})
export class SdSidebar {
  private readonly _parentControl = inject<SdSidebarContainer>(
    forwardRef(() => SdSidebarContainer),
  );

  toggle = computed(() => this._parentControl.toggle());
}
