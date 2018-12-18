import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdPaneControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: auto;
      }`;
  }

  public constructor(injector: Injector) {
    super(injector);
  }
}