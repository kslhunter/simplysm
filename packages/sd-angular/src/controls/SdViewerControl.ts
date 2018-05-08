import {ChangeDetectionStrategy, Component, HostBinding, Inject, Input} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-viewer",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdViewerControl}]
})
export class SdViewerControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public value?: string;
}

@Component({
  selector: "sd-viewer-item",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdViewerItemControl}]
})
export class SdViewerItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public value?: string;

  public constructor(@Inject(SdViewerControl)
                     private readonly _parentViewerControl: SdViewerControl) {
    super();
  }

  @HostBinding("ngIf")
  public get ngIf(): boolean {
    return this.value === this._parentViewerControl.value;
  }
}
