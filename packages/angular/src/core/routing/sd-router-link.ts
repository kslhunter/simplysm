import { Directive, inject, input } from "@angular/core";
import { Router } from "@angular/router";
import { SdNavigateWindowProvider } from "./sd-navigate-window.provider";

@Directive({
  selector: "[sdRouterLink]",
  standalone: true,
  host: {
    "[style.cursor]": "option() ? 'pointer' : ''",
    "(click)": "onClick($event)",
  },
})
export class SdRouterLink {
  private readonly _router = inject(Router);
  private readonly _sdNavigateWindow = inject(SdNavigateWindowProvider);

  option = input<
    | {
        link: string;
        params?: Record<string, string>;
        window?: {
          width?: number;
          height?: number;
        };
        outletName?: string;
        queryParams?: Record<string, string>;
      }
    | undefined
  >(undefined, { alias: "sdRouterLink" });

  async onClick(event: MouseEvent): Promise<void> {
    const option = this.option();

    if (!option) return;

    // Alt+click → 무시 (Chrome 표준: 다운로드, SPA에서는 해당 없음)
    if (event.altKey) return;

    event.preventDefault();
    event.stopPropagation();

    if (this._sdNavigateWindow.isWindow) {
      const width = option.window?.width ?? 800;
      const height = option.window?.height ?? 800;
      const qp = option.queryParams
        ? "?" + new URLSearchParams(option.queryParams).toString()
        : "";
      this._sdNavigateWindow.open(
        option.link + qp,
        option.params,
        `width=${width},height=${height}`,
      );
    } else if (event.ctrlKey || event.shiftKey) {
      const qp = option.queryParams
        ? "?" + new URLSearchParams(option.queryParams).toString()
        : "";
      this._sdNavigateWindow.open(option.link + qp, option.params);
    } else if (option.outletName == null) {
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
