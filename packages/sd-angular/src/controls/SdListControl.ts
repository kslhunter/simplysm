import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      user-select: none;
    }
  `]
})
export class SdListControl {
}
