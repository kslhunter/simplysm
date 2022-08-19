import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnInit } from "@angular/core";
import { ISdResizeEvent } from "@simplysm/sd-core-browser";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

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
        outline: 1px solid var(--theme-color-primary-default);
      }

      @media screen and (max-width: 520px) {
        @include elevation(0);
        border: 1px solid var(--border-color);
      }
    }
  `]
})
export class SdDropdownPopupControl implements OnInit {
  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone) {
  }

  public ngOnInit(): void {
    const thisEl = (this._elRef.nativeElement as HTMLElement);
    const divEl = (this._elRef.nativeElement as HTMLElement).firstElementChild!;

    this._zone.runOutsideAngular(() => {
      divEl.addEventListener("resize", (e: Event) => {
        const evt = e as ISdResizeEvent;

        if (evt.prevHeight !== evt.newHeight) {
          if (divEl.clientHeight > 300) {
            thisEl.style.height = "300px";
          }
          else {
            delete (thisEl.style as any).height;
          }
        }
      });
    });
  }
}
