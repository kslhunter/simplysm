import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: white;

      > .card {
        display: block;
      }
    }`]
})
export class SdCardControl {
}
