import {ChangeDetectionStrategy, Component} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-card",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdCardControl}]
})
export class SdCardControl extends SdComponentBase {
}
