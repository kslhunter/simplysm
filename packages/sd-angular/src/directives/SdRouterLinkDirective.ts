import {Directive, HostBinding, HostListener, Input} from "@angular/core";
import {Router} from "@angular/router";
import {JsonConvert} from "@simplysm/sd-core-common";
import {SdNavigateWindowRootProvider} from "../root-providers/SdNavigateWindowRootProvider";

@Directive({
  selector: "[sdRouterLink]"
})
export class SdRouterLinkDirective {
  @Input()
  public sdRouterLink?: [string, object?, { width?: number; height?: number }?];

  @HostBinding("style.cursor")
  public styleCursor = "pointer";

  public constructor(private readonly _router: Router,
                     private readonly _navWindow: SdNavigateWindowRootProvider) {
  }

  @HostListener("click", ["$event"])
  public async onClick(event: MouseEvent): Promise<void> {
    if (!this.sdRouterLink) return;

    event.preventDefault();
    event.stopPropagation();

    const obj = this.sdRouterLink[1];
    let newObj: { [key: string]: string } | undefined;
    if (obj) {
      newObj = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = JsonConvert.stringify(obj[key]);
      }
    }

    const width = this.sdRouterLink[2]?.width ?? 800;
    const height = this.sdRouterLink[2]?.height ?? 800;

    if (this._navWindow.isWindow) {
      this._navWindow.open(this.sdRouterLink[0], newObj, `width=${width},height=${height}`);
    }
    else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      this._navWindow.open(this.sdRouterLink[0], newObj, "_blank");
    }
    else if (event.shiftKey) {
      // 쉬프트키: 새창
      this._navWindow.open(this.sdRouterLink[0], newObj, `width=${width},height=${height}`);
    }
    else {
      await this._router.navigate([`${this.sdRouterLink[0]}`, ...(newObj ? [newObj] : [])]);
    }
  }
}