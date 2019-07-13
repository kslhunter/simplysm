import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-sidebar-brand",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-sidebar-brand {
      display: block;
      height: var(--topbar-height);
      padding: var(--gap-sm) var(--gap-default);
      border-bottom: 2px solid rgba(0, 0, 0, .2);
    }
  `]
})
export class SdSidebarBrandControl {
}
