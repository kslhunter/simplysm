import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sidebar-brand",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      height: var(--sd-topbar-height);
    }
  `]
})
export class SdSidebarBrandControl {
}
