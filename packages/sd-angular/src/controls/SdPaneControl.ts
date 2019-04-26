import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class SdPaneControl {}
