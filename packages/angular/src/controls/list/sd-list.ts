import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-list {
        display: flex;
        flex-direction: column;
        user-select: none;
        background: var(--control-color);

        &[data-sd-inset="true"] {
          background: transparent;

          sd-list {
            background: transparent;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-inset]": "inset()",
  },
})
export class SdList {
  inset = input(false, { transform: booleanAttribute });
}
