// tslint:disable:use-host-property-decorator

import {ChangeDetectionStrategy, Component, Injector, Input} from "@angular/core";

@Component({
  selector: "sd-viewer",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdViewerControl {
  @Input() public value = "";
}

@Component({
  selector: "sd-viewer-item",
  template: `
    <ng-content></ng-content>`,
  host: {
    "[class._selected]": "isSelected"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdViewerItemControl {
  @Input() public value = "";

  public get isSelected(): boolean {
    // tslint:disable-next-line:no-null-keyword
    const viewerControl = this._injector.get(SdViewerControl, null as any, undefined);
    return this.value === viewerControl.value;
  }

  public constructor(private readonly _injector: Injector) {
  }
}
