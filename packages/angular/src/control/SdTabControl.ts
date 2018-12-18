import {ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTabControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
      }`;
  }

  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  public setValue(value: any): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  public constructor(injector: Injector) {
    super(injector);
  }
}