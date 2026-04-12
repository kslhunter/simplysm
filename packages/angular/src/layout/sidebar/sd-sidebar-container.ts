import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewEncapsulation } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationStart, Router } from "@angular/router";
import { filter } from "rxjs";

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
    <ng-content />
    <div class="_backdrop" (mousedown)="onBackdropClick()"></div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";

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

      @media all and (max-width: variables.$breakpoint-mobile) {
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
export class SdSidebarContainer {
  private readonly _router = inject(Router, { optional: true });

  toggle = signal(false);

  private readonly _navStart = this._router
    ? toSignal(this._router.events.pipe(filter((e) => e instanceof NavigationStart)))
    : undefined;

  constructor() {
    const navStart = this._navStart;
    if (navStart) {
      effect(() => {
        if (navStart()) {
          this.toggle.set(false);
        }
      });
    }
  }

  onBackdropClick(): void {
    this.toggle.set(false);
  }
}
