import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdNavigateWindowProvider {
  get isWindow(): boolean {
    const urlSearchParams = new URLSearchParams(
      location.hash.slice(location.hash.indexOf(";") + 1),
    );
    return urlSearchParams.get("window") === "true";
  }

  open(navigate: string, params?: Record<string, string> | undefined, features?: string): void {
    if (this.isWindow || (features !== undefined && features !== "_blank")) {
      const newWindow = window.open(
        `${location.pathname}#${navigate};${new URLSearchParams({ ...params, window: "true" }).toString()}`,
        "",
        features,
      );

      window.addEventListener("beforeunload", () => {
        if (newWindow) {
          newWindow.close();
        }
      });
    } else {
      window.open(
        `${location.pathname}#${navigate};${new URLSearchParams(params).toString()}`,
        "_blank",
      );
    }
  }
}
