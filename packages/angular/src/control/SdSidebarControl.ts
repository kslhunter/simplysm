import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSidebarControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        position: absolute;
        z-index: ${vars.zIndex.sidebar};
        top: 0;
        left: 0;
        width: 200px;
        height: 100%;
        background: white;
      }`;
  }

  public constructor(injector: Injector) {
    super(injector);
  }
}