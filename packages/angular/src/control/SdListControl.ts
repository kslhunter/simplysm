import {ChangeDetectionStrategy, Component} from "@angular/core";


@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdListControl {
}