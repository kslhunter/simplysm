import {ChangeDetectionStrategy, Component, ElementRef, OnInit} from "@angular/core";
import {ResizeEvent} from "../plugins/ResizeEventPlugin";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
export class SdDropdownPopupControl implements OnInit {
  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngOnInit(): void {
    const thisEl = this._elRef.nativeElement;
    const divEl = this._elRef.nativeElement.firstElementChild!;

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
