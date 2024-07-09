import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, ViewEncapsulation} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>`,
  styles: [/* language=SCSS */ `
    sd-sidebar-container {
      display: block;
      position: relative;
      height: 100%;
      padding-left: var(--sidebar-width);
      transition: padding-left .1s ease-out;

      &[sd-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;
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
          transition: opacity .3s ease-in-out;
        }

        &[sd-toggle=true] {
          > ._backdrop {
            opacity: .6;
            pointer-events: auto;
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-toggle]": "toggle"
  }
})
export class SdSidebarContainerControl implements OnInit {
  #router: Router | null = inject(Router, {optional: true});
  #cdr = inject(ChangeDetectorRef);

  toggle = false;

  ngOnInit(): void {
    if (this.#router) {
      this.#router.events.subscribe((value) => {
        if (value instanceof NavigationStart) {
          this.toggle = false;
          this.#cdr.markForCheck();
        }
      });
    }
  }

  onBackdropClick() {
    this.toggle = !this.toggle;
  }
}


