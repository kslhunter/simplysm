import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: "",
  styles: [
    /* language=SCSS */ `
      sd-toast-container {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        pointer-events: none;
        padding: var(--gap-xxl);
        z-index: var(--z-index-toast);

        @media all and (max-width: 520px) {
          flex-direction: column-reverse;
        }
      }
    `,
  ],
})
export class SdToastContainerControl {}
