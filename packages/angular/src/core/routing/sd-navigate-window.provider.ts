import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdNavigateWindowProvider {
  private readonly _openedWindows = new Set<Window>();
  private _beforeUnloadRegistered = false;

  get isWindow(): boolean {
    const semicolonIdx = location.hash.indexOf(";");
    if (semicolonIdx === -1) return false;
    const urlSearchParams = new URLSearchParams(location.hash.slice(semicolonIdx + 1));
    return urlSearchParams.get("window") === "true";
  }

  open(navigate: string, params?: Record<string, string>, features?: string): void {
    if (this.isWindow || (features != null && features !== "")) {
      const newWindow = window.open(
        `${location.pathname}#${navigate};${new URLSearchParams({ ...params, window: "true" }).toString()}`,
        "",
        features,
      );

      if (newWindow) {
        this._openedWindows.add(newWindow);
      }

      if (!this._beforeUnloadRegistered) {
        this._beforeUnloadRegistered = true;
        window.addEventListener("beforeunload", () => {
          for (const w of this._openedWindows) {
            w.close();
          }
          this._openedWindows.clear();
        });
      }
    } else {
      const paramStr = params !== undefined ? new URLSearchParams(params).toString() : "";
      const suffix = paramStr !== "" ? `;${paramStr}` : "";
      window.open(
        `${location.pathname}#${navigate}${suffix}`,
        "_blank",
      );
    }
  }
}
