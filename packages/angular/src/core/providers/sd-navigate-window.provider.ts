import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdNavigateWindowProvider {
  private _beforeUnloadController: AbortController | undefined;

  get isWindow(): boolean {
    const urlSearchParams = new URLSearchParams(
      location.hash.slice(location.hash.indexOf(";") + 1),
    );
    return urlSearchParams.get("window") === "true";
  }

  open(navigate: string, params?: Record<string, string>, features?: string): void {
    if (this.isWindow || (features != null && features !== "")) {
      const newWindow = window.open(
        `${location.pathname}#${navigate};${new URLSearchParams({ ...params, window: "true" }).toString()}`,
        "",
        features,
      );

      // 기존 beforeunload 리스너 제거
      if (this._beforeUnloadController != null) {
        this._beforeUnloadController.abort();
      }
      this._beforeUnloadController = new AbortController();

      window.addEventListener(
        "beforeunload",
        () => {
          if (newWindow) {
            newWindow.close();
          }
        },
        { signal: this._beforeUnloadController.signal },
      );
    } else {
      window.open(
        `${location.pathname}#${navigate};${new URLSearchParams(params).toString()}`,
        "_blank",
      );
    }
  }
}
