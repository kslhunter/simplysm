import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {Exception} from "../../../sd-core/src";

@Component({
  selector: "sd-enum",
  template: `
        <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdEnumControl {
  public constructor() {
  }
}

@Component({
  selector: "sd-enum-item",
  template: `
        <label *ngIf="label">{{ label }}</label>
        <span><ng-content></ng-content></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdEnumItemControl {
  @Input()
  public set label(value: string) {
    if (!(typeof value === "string")) {
      throw new Exception(`'sd-enum.label'에 잘못된값 '${JSON.stringify(value)}'가 입력되었습니다.`);
    }

    this._label = value;
  }

  public get label(): string {
    return this._label;
  }

  private _label = "";
}