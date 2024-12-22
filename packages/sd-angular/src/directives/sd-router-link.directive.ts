import { Directive, HostListener, inject, input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "../providers/sd-navigate-window.provider";

@Directive({
  selector: "[sd-router-link]",
  standalone: true,
  host: {
    "[style.cursor]": "'pointer'",
  },
})
export class SdRouterLinkDirective {
  #router = inject(Router);
  #navWindow = inject(SdNavigateWindowProvider);

  link = input<[
    string, Record<string, string>?, {
      width?: number;
      height?: number
    }?, string?
  ] | undefined>(
    undefined,
    { alias: "sd-router-link" },
  );

  @HostListener("click", ["$event"])
  async onClick(event: MouseEvent): Promise<void> {
    const link = this.link();

    if (!link) return;

    event.preventDefault();
    event.stopPropagation();

    const obj = link[1];

    if (this.#navWindow.isWindow) {
      const width = link[2]?.width ?? 800;
      const height = link[2]?.height ?? 800;
      this.#navWindow.open(link[0], obj, `width=${width},height=${height}`);
    }
    else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      this.#navWindow.open(link[0], obj, "_blank");
    }
    else if (event.shiftKey) {
      // 쉬프트키: 새창
      const width = link[2]?.width ?? 800;
      const height = link[2]?.height ?? 800;
      this.#navWindow.open(link[0], obj, `width=${width},height=${height}`);
    }
    else if (link[3] === undefined) {
      await this.#router.navigate([`${link[0]}`, ...(obj ? [obj] : [])]);
    }
    else {
      await this.#router.navigate([
        { outlets: { [link[3]]: link[0] } },
        ...(obj ? [obj] : []),
      ]);
    }
  }
}
