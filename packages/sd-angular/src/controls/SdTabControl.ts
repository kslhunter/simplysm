// tslint:disable:use-host-property-decorator

import {ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output} from "@angular/core";

@Component({
  selector: "sd-tab",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTabControl {
  @Input() public value = "";
  @Output() public readonly valueChange = new EventEmitter<string | undefined>();
}

@Component({
  selector: "sd-tab-item",
  template: `
    <ng-content></ng-content>`,
  host: {
    "[class]": "styleClass",
    "(click)": "onClick()"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTabItemControl {
  @Input() public value = "";

  public get styleClass(): string {
    // tslint:disable-next-line:no-null-keyword
    const tabControl = this._injector.get(SdTabControl, null as any, undefined);

    return [
      this.value === tabControl.value ? "_selected" : ""
    ].filter(item => item).join(" ");
  }

  public constructor(private readonly _injector: Injector) {
  }

  public onClick(): void {
    // tslint:disable-next-line:no-null-keyword
    const tabControl = this._injector.get(SdTabControl, null as any, undefined);
    tabControl.valueChange.emit(this.value);
  }
}
