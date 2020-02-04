import {Injectable} from "@angular/core";
import * as querystring from "querystring";

@Injectable()
export class SdNavigateWindowProvider {
  public get isWindow(): boolean {
    const params = querystring.parse(location.hash.slice(location.hash.indexOf(";") + 1));
    return params["window"] === "true";
  }

  public open(navigate: string, params?: { [key: string]: string } | undefined, features?: string): void {
    if (this.isWindow || (features && features !== "_blank")) {
      const newWindow = window.open(
        `${location.pathname}#${navigate};${querystring.stringify({...params, window: true})}`,
        "",
        features
      );

      window.addEventListener("beforeunload", () => {
        if (newWindow) {
          newWindow.close();
        }
      });
    }
    else {
      window.open(
        `${location.pathname}#${navigate};${querystring.stringify(params)}`,
        "_blank"
      );
    }
  }
}