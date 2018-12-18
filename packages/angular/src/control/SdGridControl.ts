import {ChangeDetectionStrategy, Component} from "@angular/core";


@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdGridControl {
}