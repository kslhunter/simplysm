import { Directive, HostBinding, HostListener, Input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowRootProvider } from "../../root-providers/SdNavigateWindowRootProvider";

@Directive({
  selector: "[sdRouterLink]"
})
export class SdRouterLinkDirective {
  @Input()
  public sdRouterLink?: [string, Record<string, string>?, { width?: number; height?: number }?, string?];

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

    if (this._navWindow.isWindow) {
      const width = this.sdRouterLink[2]?.width ?? 800;
      const height = this.sdRouterLink[2]?.height ?? 800;
      this._navWindow.open(this.sdRouterLink[0], obj, `width=${width},height=${height}`);
    }
    else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      this._navWindow.open(this.sdRouterLink[0], obj, "_blank");
    }
    else if (event.shiftKey) {
      // 쉬프트키: 새창
      const width = this.sdRouterLink[2]?.width ?? 800;
      const height = this.sdRouterLink[2]?.height ?? 800;
      this._navWindow.open(this.sdRouterLink[0], obj, `width=${width},height=${height}`);
    }
    else if (this.sdRouterLink[3] === undefined) {
      await this._router.navigate([`${this.sdRouterLink[0]}`, ...(obj ? [obj] : [])]);
    }
    else {
      await this._router.navigate([{ outlets: { [this.sdRouterLink[3]]: this.sdRouterLink[0] } }, ...(obj ? [obj] : [])]);
    }
  }
}
