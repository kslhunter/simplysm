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
      //border-bottom: 1px solid var(--theme-color-blue-grey-darker);
      //background: var(--theme-color-blue-grey-darker);
    }
  `]
})
export class SdSidebarBrandControl {
}
