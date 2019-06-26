import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [`
    sd-pane {
      display: block;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
  `]
})
export class SdPaneControl {
}
