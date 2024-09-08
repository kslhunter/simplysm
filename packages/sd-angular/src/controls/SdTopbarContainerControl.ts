import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
  styles: [
    /* language=SCSS */ `
      sd-topbar-container {
        display: block;
        position: relative;
        height: 100%;
      }
    `,
  ],
})
export class SdTopbarContainerControl {
  elRef = inject<ElementRef<HTMLElement>>(ElementRef);
}
