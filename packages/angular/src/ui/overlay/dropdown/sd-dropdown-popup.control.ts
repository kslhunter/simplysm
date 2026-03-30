import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdEventsDirective } from "../../../core/directives/sd-events.directive";
import { SdDropdownControl } from "./sd-dropdown.control";
import type { ISdResizeEvent } from "../../../core/plugins/events/sd-resize-event.plugin";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  host: {
    "(keydown)": "onKeydown($event)",
  },
  template: `
    <div (sdResize)="onResize($event)">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";
      @use "../../../../scss/commons/variables";

      sd-dropdown-popup {
        position: fixed;
        z-index: var(--z-index-dropdown);
        opacity: 0;
        transform: translateY(-0.625rem);
        transition: 0.1s linear;
        transition-property: transform, opacity;
        pointer-events: none;
        background: var(--control-color);
        min-width: 7.5rem;
        @include mixins.elevation(4);
        overflow: hidden;
        border-radius: var(--border-radius-default);
        border: 1px solid var(--border-color-light);

        > div {
          width: 100%;
          height: 100%;
          overflow: auto;
          white-space: nowrap;
        }

        &:focus {
          outline: 1px solid var(--theme-primary-default);
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          @include mixins.elevation(0);
          border: 1px solid var(--border-color-default);
        }

        &[data-sd-mobile] {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: auto;
          max-height: 80vh;
          border-radius: var(--border-radius-default) var(--border-radius-default) 0 0;
          opacity: 1;
          pointer-events: auto;
          transform: none;
          animation: sd-dropdown-slide-up 0.2s ease-out;
          @include mixins.elevation(8);
        }
      }

      @keyframes sd-dropdown-slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class SdDropdownPopupControl {
  private readonly _parentControl = inject<SdDropdownControl>(
    forwardRef(() => SdDropdownControl),
  );
  private readonly _elRef = inject(ElementRef<HTMLElement>);

  onKeydown(event: KeyboardEvent): void {
    this._parentControl.onPopupKeydown(event);
  }

  onResize(_event: ISdResizeEvent): void {
    const el = this._elRef.nativeElement;
    const divEl = el.firstElementChild as HTMLElement;

    if (divEl.clientHeight > 300) {
      el.style.height = "18.75rem";
    } else {
      el.style.height = "";
    }
  }
}
