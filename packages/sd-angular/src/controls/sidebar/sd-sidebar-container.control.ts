import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { $signal } from "../../utils/bindings/$signal";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-toggle]": "toggle()",
  },
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-sidebar-container {
        display: block;
        position: relative;
        height: 100%;
        padding-left: var(--sidebar-width);
        transition: padding-left 0.1s ease-out;

        &[data-sd-toggle="true"] {
          padding-left: 0;
          transition: padding-left 0.1s ease-in;
        }

        > ._backdrop {
          display: none;
        }
      }

      @media all and (max-width: 520px) {
        sd-sidebar-container {
          padding-left: 0;

          > ._backdrop {
            position: absolute;
            display: block;
            z-index: calc(var(--z-index-sidebar) - 1);
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--background-rev-color);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease-in-out;
          }

          &[data-sd-toggle="true"] {
            > ._backdrop {
              opacity: 0.6;
              pointer-events: auto;
            }
          }
        }
      }
    `,
  ],
})
export class SdSidebarContainerControl {
  #router: Router | null = inject(Router, { optional: true });

  toggle = $signal(false);

  constructor() {
    if (this.#router) {
      this.#router.events.subscribe((value) => {
        if (value instanceof NavigationStart) {
          this.toggle.set(false);
        }
      });
    }
  }

  onBackdropClick() {
    this.toggle.update((v) => !v);
  }
}
