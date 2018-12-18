import {ChangeDetectionStrategy, Component, Injector, Input} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdViewControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        background: white;
      }`;
  }

  @Input()
  public value?: any;

  public constructor(injector: Injector) {
    super(injector);
  }
}