import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ``,
  styles: [/* language=SCSS */ `
    sd-toast-container {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      pointer-events: none;
      padding: var(--gap-xxl);
      z-index: var(--z-index-toast);
    }
  `]
})
export class SdToastContainerControl {
}
