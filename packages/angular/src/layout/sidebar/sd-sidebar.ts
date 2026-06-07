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
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";
      @use "../../../scss/commons/variables";

      sd-sidebar {
        position: absolute;
        z-index: var(--z-index-sidebar);
        top: 0;
        left: 0;
        width: var(--sidebar-width);
        height: 100%;
        //background: var(--control-color);
        background: var(--theme-gray-lightest);
        //border-right: 1px solid var(--border-color-lighter);

        @media not all and (max-width: variables.$breakpoint-mobile) {
          transition: transform 0.1s ease-out;

          &[data-sd-toggle="true"] {
            transform: translateX(-100%);
            transition: transform 0.1s ease-in;
          }
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          transition: transform 0.3s ease-in;
          transform: translateX(-100%);

          &[data-sd-toggle="true"] {
            transform: none;
            transition: transform 0.3s ease-out;
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
