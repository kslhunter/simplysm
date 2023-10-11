import {ChangeDetectionStrategy, Component, ElementRef} from "@angular/core";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div (sdResize)="onResize()">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
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

      > div {
        width: 100%;
        height: 100%;
        overflow: auto;
        white-space: nowrap;
      }

      &:focus {
        outline: 1px solid var(--theme-primary-default);
      }

      @media screen and (max-width: 520px) {
        @include elevation(0);
        border: 1px solid var(--border-color-default);
      }
    }
  `]
})
export class SdDropdownPopupControl {
  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public onResize(): void {
    const thisEl = this._elRef.nativeElement;
    const divEl = this._elRef.nativeElement.firstElementChild!;

    if (divEl.clientHeight > 300) {
      thisEl.style.height = "300px";
    }
    else {
      delete (thisEl.style as any).height;
    }
  }
}
