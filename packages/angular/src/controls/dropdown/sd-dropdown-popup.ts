import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdown } from "./sd-dropdown";
import { SdResizeDirective } from "../../core/events/sd-resize";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdResizeDirective],
  host: {
    "(keydown)": "onKeydown($event)",
  },
  template: `
    <div (sdResize)="onResize()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";
      @use "../../../scss/commons/variables";

      sd-dropdown-popup {
        position: fixed;
        z-index: var(--sd-z-dropdown);
        opacity: 0;
        transform: translateY(-0.625rem);
        transition: var(--sd-animation-duration) linear;
        transition-property: transform, opacity;
        pointer-events: none;
        background-color: var(--sd-bg-overlay);
        min-width: 7.5rem;
        @include mixins.elevation(4);
        overflow: hidden;
        border-radius: var(--sd-radius-default);
        border: 1px solid var(--sd-dropdown-bd);

        > div {
          width: 100%;
          height: 100%;
          overflow: auto;
          white-space: nowrap;
        }

        &:focus {
          outline: 1px solid var(--sd-focus-ring-color);
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          @include mixins.elevation(0);
          border: 1px solid var(--sd-bd-strong);
        }

        &[data-sd-mobile] {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: auto;
          max-height: 80vh;
          border-radius: var(--sd-radius-default) var(--sd-radius-default) 0 0;
          opacity: 1;
          pointer-events: auto;
          transform: none;
          animation: sd-dropdown-slide-up var(--sd-animation-duration) ease-out;
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
export class SdDropdownPopup {
  private readonly _parentControl = inject<SdDropdown>(forwardRef(() => SdDropdown));
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private _capped = false;

  onKeydown(event: KeyboardEvent): void {
    this._parentControl.onPopupKeydown(event);
  }

  onResize(): void {
    const el = this._elRef.nativeElement;
    const divEl = el.firstElementChild as HTMLElement;
    const shouldCap = divEl.scrollHeight > 300;
    if (shouldCap === this._capped) return;
    this._capped = shouldCap;
    if (shouldCap) {
      el.style.height = "300px";
    } else {
      el.style.removeProperty("height");
    }
  }
}
