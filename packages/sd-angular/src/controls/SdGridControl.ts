import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-grid",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdGridControl}]
})
export class SdGridControl extends SdComponentBase {
}

@Component({
  selector: "sd-grid-item",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdGridItemControl}]
})
export class SdGridItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: Number,
    validator: value => value < 12,
    notnull: true
  })
  public colspan = 12;

  @HostBinding("style.width")
  public get width(): string {
    return `${(100 / 12) * this.colspan}%`;
  }
}
