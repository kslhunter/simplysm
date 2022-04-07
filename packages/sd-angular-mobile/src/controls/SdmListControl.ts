import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sdm-list",
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
export class SdmListControl {
}