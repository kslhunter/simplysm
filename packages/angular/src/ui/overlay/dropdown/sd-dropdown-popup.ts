import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdown } from "./sd-dropdown";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "(keydown)": "onKeydown($event)",
  },
  template: `
    <div>
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
export class SdDropdownPopup {
  private readonly _parentControl = inject<SdDropdown>(
    forwardRef(() => SdDropdown),
  );

  onKeydown(event: KeyboardEvent): void {
    this._parentControl.onPopupKeydown(event);
  }
}
