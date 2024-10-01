import { Directive, HostListener, inject, input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "../providers/SdNavigateWindowProvider";
import { $hostBinding } from "../utils/$hostBinding";

@Directive({
  selector: "[sdRouterLink]",
  standalone: true,
})
export class SdRouterLinkDirective {
  #router = inject(Router);
  #navWindow = inject(SdNavigateWindowProvider);

  sdRouterLink = input<[string, Record<string, string>?, { width?: number; height?: number }?, string?]>();

  constructor() {
    $hostBinding("style.cursor", { value: "pointer" });
  }

  @HostListener("click", ["$event"])
  async onClick(event: MouseEvent): Promise<void> {
    const routerLink = this.sdRouterLink();

    if (!routerLink) return;

    event.preventDefault();
    event.stopPropagation();

    const obj = routerLink[1];

    if (this.#navWindow.isWindow) {
      const width = routerLink[2]?.width ?? 800;
      const height = routerLink[2]?.height ?? 800;
      this.#navWindow.open(routerLink[0], obj, `width=${width},height=${height}`);
    } else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      this.#navWindow.open(routerLink[0], obj, "_blank");
    } else if (event.shiftKey) {
      // 쉬프트키: 새창
      const width = routerLink[2]?.width ?? 800;
      const height = routerLink[2]?.height ?? 800;
      this.#navWindow.open(routerLink[0], obj, `width=${width},height=${height}`);
    } else if (routerLink[3] === undefined) {
      await this.#router.navigate([`${routerLink[0]}`, ...(obj ? [obj] : [])]);
    } else {
      await this.#router.navigate([{ outlets: { [routerLink[3]]: routerLink[0] } }, ...(obj ? [obj] : [])]);
    }
  }
}
