import {ChangeDetectionStrategy, Component, HostBinding, Injector, Input} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdGridItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: inline-block;
        vertical-align: top;
      }`;
  }

  @Input()
  @HostBinding("style.width")
  public width = "100%";

  public constructor(injector: Injector) {
    super(injector);
  }
}