import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-enum",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdEnumControl}]
})
export class SdEnumControl extends SdComponentBase {
}

@Component({
  selector: "sd-enum-item",
  template: `
    <label *ngIf="label">{{ label }}</label>
    <span><ng-content></ng-content></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdEnumItemControl}]
})
export class SdEnumItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public label?: string;
}
