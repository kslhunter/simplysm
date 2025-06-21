import { ChangeDetectionStrategy, Component, forwardRef, inject, ViewEncapsulation } from "@angular/core";
import { SdSidebarContainerControl } from "./sd-sidebar-container.control";
import { $computed } from "../../utils/bindings/$computed";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

      sd-sidebar {
        display: block;
        position: absolute;
        z-index: var(--z-index-sidebar);
        top: 0;
        left: 0;
        width: var(--sidebar-width);
        height: 100%;
        animation: sd-sidebar var(--animation-duration) ease-in;

        //-- 화면 크기

        @media not all and (max-width: 520px) {
          transition: transform 0.1s ease-out;

          &[sd-toggle="true"] {
            transform: translateX(-100%);
            transition: transform 0.1s ease-in;
          }
        }

        @media all and (max-width: 520px) {
          transition: transform 0.3s ease-in;
          transform: translateX(-100%);
          animation: none;

          &[sd-toggle="true"] {
            transform: none;
            transition: transform 0.3s ease-out;
            @include mixins.elevation(16);
          }
        }
      }

      @keyframes sd-sidebar {
        from {
          opacity: 0;
          transform: translateX(-1em);
        }
      }
    `,
  ],
  host: {
    "[attr.sd-toggle]": "toggle()",
  },
})
export class SdSidebarControl {
  #parentControl = inject<SdSidebarContainerControl>(forwardRef(() => SdSidebarContainerControl));

  toggle = $computed(() => this.#parentControl.toggle());
}
