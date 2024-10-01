import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { $hostBinding } from "../utils/$hostBinding";
import { $reactive } from "../utils/$reactive";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-sidebar-container {
        display: block;
        position: relative;
        height: 100%;
        padding-left: var(--sidebar-width);
        transition: padding-left 0.1s ease-out;

        &[sd-toggle="true"] {
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
            background: black;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease-in-out;
          }

          &[sd-toggle="true"] {
            > ._backdrop {
              opacity: 0.6;
              pointer-events: auto;
            }
          }
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>
  `,
})
export class SdSidebarContainerControl {
  #router: Router | null = inject(Router, { optional: true });

  toggle$ = $reactive(false);

  constructor() {
    $hostBinding("attr.sd-toggle", this.toggle$);

    if (this.#router) {
      this.#router.events.subscribe((value) => {
        if (value instanceof NavigationStart) {
          this.toggle$.value = false;
        }
      });
    }
  }

  onBackdropClick() {
    this.toggle$.value = !this.toggle$.value;
  }
}
