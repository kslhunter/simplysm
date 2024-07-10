import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, inject, ViewEncapsulation} from "@angular/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdEventsDirective} from "../directives/SdEventsDirective";

// TODO: 모바일일때는 모달 형식으로 표현
@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdEventsDirective,
  ],
  template: `
    <div (sdResize.outside)="onResizeOutside()" (keydown)="onKeyDown($event)">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-dropdown-popup {
      position: fixed;
      z-index: var(--z-index-dropdown);
      opacity: 0;
      transform: translateY(-10px);
      transition: .1s linear;
      transition-property: transform, opacity;
      pointer-events: none;
      background: white;
      min-width: 120px;
      @include elevation(6);
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
        @include elevation(0);
        border: 1px solid var(--border-color-default);
      }
    }
  `]
})
export class SdDropdownPopupControl {
  #parentControl: SdDropdownControl = inject(forwardRef(() => SdDropdownControl));
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  onKeyDown(event: KeyboardEvent) {
    this.#parentControl.onPopupKeydown(event);
  }

  onResizeOutside() {
    const el = this.#elRef.nativeElement;
    const divEl = this.#elRef.nativeElement.firstElementChild!;

    if (divEl.clientHeight > 300) {
      el.style.height = "300px";
    }
    else {
      delete (el.style as any).height;
    }
  }
}
