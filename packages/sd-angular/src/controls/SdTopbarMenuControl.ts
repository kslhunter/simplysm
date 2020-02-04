import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      color: var(--text-brightness-rev-dark);

      &:hover {
        background: var(--trans-brightness-default);
        color: var(--text-brightness-rev-default);
      }
    }
  `]
})
export class SdTopbarMenuControl {
}
