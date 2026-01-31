import { Directive, inject, input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "../providers/integration/sd-navigate-window.provider";
import * as querystring from "querystring";
import type { ParsedUrlQuery } from "querystring";

@Directive({
  selector: "[sd-router-link]",
  standalone: true,
  host: {
    "[style.cursor]": "'pointer'",
    "(click)": "onClick($event)",
  },
})
export class SdRouterLinkDirective {
  private readonly _router = inject(Router);
  private readonly _navWindow = inject(SdNavigateWindowProvider);

  option = input<
    | {
        link: string;
        params?: Record<string, string>;
        window?: {
          width?: number;
          height?: number;
        };
        outletName?: string;
        queryParams?: Record<string, string> | ParsedUrlQuery;
      }
    | undefined
  >(undefined, { alias: "sd-router-link" });

  async onClick(event: MouseEvent): Promise<void> {
    const option = this.option();

    if (!option) return;

    event.preventDefault();
    event.stopPropagation();

    // const obj = link[1];

    if (this._navWindow.isWindow) {
      const width = option.window?.width ?? 800;
      const height = option.window?.height ?? 800;
      const qp = option.queryParams ? "?" + querystring.stringify(option.queryParams) : "";
      this._navWindow.open(option.link + qp, option.params, `width=${width},height=${height}`);
    } else if (event.ctrlKey || event.altKey) {
      // 알트키: 새탭
      // 컨트롤키: 새탭 (새탭이 포커싱되지 않음)
      const qp = option.queryParams ? "?" + querystring.stringify(option.queryParams) : "";
      this._navWindow.open(option.link + qp, option.params, "_blank");
    } else if (event.shiftKey) {
      // 쉬프트키: 새창
      const width = option.window?.width ?? 800;
      const height = option.window?.height ?? 800;

      const qp = option.queryParams ? "?" + querystring.stringify(option.queryParams) : "";
      this._navWindow.open(option.link + qp, option.params, `width=${width},height=${height}`);
    } else if (option.outletName === undefined) {
      await this._router.navigate(
        [option.link, ...(option.params ? [option.params] : [])],
        option.queryParams ? { queryParams: option.queryParams } : undefined,
      );
    } else {
      await this._router.navigate(
        [
          { outlets: { [option.outletName]: option.link } },
          ...(option.params ? [option.params] : []),
        ],
        option.queryParams ? { queryParams: option.queryParams } : undefined,
      );
    }
  }
}
