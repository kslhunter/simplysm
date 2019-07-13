import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewEncapsulation} from "@angular/core";
import {ResizeEvent} from "../../commons/ResizeEvent";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div>
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

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

      > div {
        width: 100%;
        height: 100%;
        overflow: auto;
      }

      &:focus {
        outline: 1px solid var(--theme-primary-default);
      }
    }
  `]
})
export class SdDropdownPopupControl implements OnInit {
  public constructor(private readonly _elRef: ElementRef) {
  }

  public ngOnInit(): void {
    const thisEl = (this._elRef.nativeElement as HTMLElement);
    const divEl = (this._elRef.nativeElement as HTMLElement).firstElementChild!;

    divEl.addEventListener("resize", (e: Event) => {
      const evt = e as ResizeEvent;

      if (evt.detail.dimensions.includes("height")) {
        if (divEl.clientHeight > 300) {
          thisEl.style.height = "300px";
        }
        else {
          delete thisEl.style.height;
        }
      }
    });
  }
}
