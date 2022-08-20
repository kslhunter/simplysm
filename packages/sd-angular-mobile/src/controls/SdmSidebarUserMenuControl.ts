import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sdm-sidebar-user-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
    }
  `]
})

export class SdmSidebarUserMenuControl {
}
