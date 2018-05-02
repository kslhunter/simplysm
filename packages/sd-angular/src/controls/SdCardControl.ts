import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-card",
  template: `
        <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCardControl {
}