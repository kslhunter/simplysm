import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-list-item-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class SdListItemButtonControl {}
