import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-list-item-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-list-item-button {
      display: block;
      min-width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip));
      text-align: center;
      padding: var(--gap-sm) var(--gap-default);
      background: transparent;
      color: var(--theme-primary-default);

      &:hover {
        background: rgba(0, 0, 0, .07);
        cursor: pointer;
      }
    }
  `]
})
export class SdListItemButtonControl {
}
