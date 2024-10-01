import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { $reactive } from "../utils/$reactive";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-topbar-container {
        display: block;
        position: relative;
        height: 100%;
      }
    `,
  ],
  template: `<ng-content></ng-content>`,
})
export class SdTopbarContainerControl {
  paddingTop$ = $reactive<string>();

  constructor() {
    $hostBinding("style.padding-top", this.paddingTop$);
  }
}
