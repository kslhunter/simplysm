import {ChangeDetectionStrategy, Component} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-pane",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdPaneControl}]
})
export class SdPaneControl extends SdComponentBase {
}
