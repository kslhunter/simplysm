import {ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output} from "@angular/core";

@Component({
  selector: "sd-tab",
  template: `
        <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdTabControl {
  @Input() public value = "";
  @Output() public readonly valueChange = new EventEmitter();
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

  public constructor(private _injector: Injector) {
  }

  public get styleClass(): string {
    //tslint:disable-next-line:no-null-keyword
    const tabControl = this._injector.get(SdTabControl, null);

    return [
      this.value === tabControl.value ? "_selected" : ""
    ].filter((item) => item).join(" ");
  }

  public onClick(): void {
    //tslint:disable-next-line:no-null-keyword
    const tabControl = this._injector.get(SdTabControl, null);
    tabControl.valueChange.emit(this.value);
  }
}