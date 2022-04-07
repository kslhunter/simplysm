import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class SdGridControl {
}
