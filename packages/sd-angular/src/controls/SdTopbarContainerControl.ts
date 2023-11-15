import {ChangeDetectionStrategy, Component, ElementRef, inject} from "@angular/core";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
  `]
})
export class SdTopbarContainerControl {
  elRef: ElementRef<HTMLElement> = inject(ElementRef);
}
