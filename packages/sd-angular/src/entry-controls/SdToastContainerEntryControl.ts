import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [/* language=SCSS */ `
    :host {
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
export class SdToastContainerEntryControl {
}
