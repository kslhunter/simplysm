import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownControl } from "./sd-dropdown.control";
import { SdEventsDirective } from "../../../core/directives/sd-events.directive";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";

// TODO: 모바일일때는 모달 형식으로 표현
@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <div (sdResize)="onResize()" (keydown)="onKeyDown($event)">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-dropdown-popup {
        position: fixed;
        z-index: var(--z-index-dropdown);
        opacity: 0;
        transform: translateY(-10px);
        transition: 0.1s linear;
        transition-property: transform, opacity;
        pointer-events: none;
        background: var(--control-color);
        min-width: 120px;
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

        @media all and (max-width: 520px) {
          @include mixins.elevation(0);
          border: 1px solid var(--border-color-default);
        }
      }
    `,
  ],
})
export class SdDropdownPopupControl {
  private readonly _parentControl = inject<SdDropdownControl>(forwardRef(() => SdDropdownControl));
  private readonly _elRef = injectElementRef<HTMLElement>();

  onKeyDown(event: KeyboardEvent) {
    this._parentControl.onPopupKeydown(event);
  }

  onResize() {
    const el = this._elRef.nativeElement;
    const divEl = this._elRef.nativeElement.firstElementChild!;

    if (divEl.clientHeight > 300) {
      el.style.height = "300px";
    } else {
      delete (el.style as any).height;
    }
  }
}
