import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;

      display: flex;
      flex-direction: column;
      padding: var(--gap-xxl);
      z-index: var(--z-index-toast);

      pointer-events: none;
    }
  `]
})
export class SdToastContainerControl {
}
