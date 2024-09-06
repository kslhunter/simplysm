import { Directive, HostListener, inject, Input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "../providers/SdNavigateWindowProvider";

@Directive({
  selector: "[sdRouterLink]",
  standalone: true,
  host: {
    "[style.cursor]": "'pointer'",
  },
})
export class SdRouterLinkDirective {
  #router = inject(Router);
  #navWindow = inject(SdNavigateWindowProvider);

  @Input() sdRouterLink?: [string, Record<string, string>?, { width?: number; height?: number }?, string?];

  @HostListener("click", ["$event"])
  async onClick(event: MouseEvent): Promise<void> {
    if (!this.sdRouterLink) return;

    event.preventDefault();
    event.stopPropagation();

    const obj = this.sdRouterLink[1];

    if (this.#navWindow.isWindow) {
      const width = this.sdRouterLink[2]?.width ?? 800;
      const height = this.sdRouterLink[2]?.height ?? 800;
      this.#navWindow.open(this.sdRouterLink[0], obj, `width=${width},height=${height}`);
    } else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      this.#navWindow.open(this.sdRouterLink[0], obj, "_blank");
    } else if (event.shiftKey) {
      // 쉬프트키: 새창
      const width = this.sdRouterLink[2]?.width ?? 800;
      const height = this.sdRouterLink[2]?.height ?? 800;
      this.#navWindow.open(this.sdRouterLink[0], obj, `width=${width},height=${height}`);
    } else if (this.sdRouterLink[3] === undefined) {
      await this.#router.navigate([`${this.sdRouterLink[0]}`, ...(obj ? [obj] : [])]);
    } else {
      await this.#router.navigate([
        { outlets: { [this.sdRouterLink[3]]: this.sdRouterLink[0] } },
        ...(obj ? [obj] : []),
      ]);
    }
  }
}
