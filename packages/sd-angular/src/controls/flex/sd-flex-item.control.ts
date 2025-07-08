import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdFlexControl } from "./sd-flex.control";
import { transformBoolean } from "../../utils/type-tramsforms";

@Component({
  selector: "sd-flex-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-flex-item {
        display: block;

        flex: 0 1 auto;

        &[data-sd-fill="true"] {
          flex: 1 1 auto;
          overflow: auto;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-fill]": "fill()",
    // "[style.flex]": "fill() ? '1 1 auto' : '0 1 0%'",
    // "[style.overflow]": "fill() ? 'auto' : undefined",
    // "[style.width]": "fill() ? '100%' : undefined",
    // "[style.height]": "parent.vertical() && fill() ? '100%' : undefined",
    "[style.min-height]": "parent.vertical() && fill() ? '0' : undefined",
    "[style.padding-left]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
    "[style.padding-right]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
  },
})
export class SdFlexItemControl {
  parent = inject(SdFlexControl);
  fill = input(false, { transform: transformBoolean });
}
