import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-view {
        display: block;
        background: white;

        &[sd-fill="true"] {
          height: 100%;
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
  host: {
    "[attr.sd-fill]": "fill()",
  },
})
export class SdViewControl {
  value = input<any>();
  fill = input(false);
}
