import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sidebar-user-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: var(--trans-default);
    }
  `]
})

export class SdSidebarUserMenuControl {
}
