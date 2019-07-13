import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-list {
      display: block;
      user-select: none;
      background: white;
    }
  `]
})
export class SdListControl {
}
