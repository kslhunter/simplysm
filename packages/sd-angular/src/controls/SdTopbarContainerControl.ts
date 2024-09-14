import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from "@angular/core";

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
  template: ` <ng-content></ng-content>`,
  host: {
    "[style.padding-top]": "paddingTop()",
  },
})
export class SdTopbarContainerControl {
  paddingTop = signal<string | undefined>(undefined);
}
