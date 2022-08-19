import { Injectable } from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

@Injectable({ providedIn: "root" })
export class SdIconsRootProvider {
  private _iconRecord: Record<string, IconDefinition | undefined> = {};

  public async registerAsync(iconRecord: Record<string, Promise<IconDefinition>>): Promise<void> {
    for (const key of Object.keys(iconRecord)) {
      this._iconRecord[key] = await iconRecord[key];
    }
  }

  public get(key: string): IconDefinition {
    if (!this._iconRecord[key]) {
      throw new Error(`SdIconRootProvider에 [${key}]가 등록되어있지 않습니다.`);
    }
    else {
      return this._iconRecord[key]!;
    }
  }
}
