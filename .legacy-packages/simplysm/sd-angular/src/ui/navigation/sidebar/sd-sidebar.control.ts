import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdSidebarContainerControl } from "./sd-sidebar-container.control";
import { $computed } from "../../../core/utils/bindings/$computed";

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
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-sidebar {
        position: absolute;
        z-index: var(--z-index-sidebar);
        top: 0;
        left: 0;
        width: var(--sidebar-width);
        height: 100%;
        //animation: sd-sidebar var(--animation-duration) ease-in;
        background: var(--control-color);
        border-right: 1px solid var(--border-color-lighter);

        //-- 화면 크기

        @media not all and (max-width: 520px) {
          transition: transform 0.1s ease-out;

          &[data-sd-toggle="true"] {
            transform: translateX(-100%);
            transition: transform 0.1s ease-in;
          }
        }

        @media all and (max-width: 520px) {
          transition: transform 0.3s ease-in;
          transform: translateX(-100%);
          animation: none;

          &[data-sd-toggle="true"] {
            transform: none;
            transition: transform 0.3s ease-out;
            @include mixins.elevation(16);
          }
        }
      }

      /*@keyframes sd-sidebar {
        from {
          opacity: 0;
          transform: translateX(-1em);
        }
      }*/
    `,
  ],
})
export class SdSidebarControl {
  private readonly _parentControl = inject<SdSidebarContainerControl>(
    forwardRef(() => SdSidebarContainerControl),
  );

  toggle = $computed(() => this._parentControl.toggle());
}
