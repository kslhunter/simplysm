import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdFlexControl } from "./sd-flex.control";
import { $computed } from "../../utils/bindings/$computed";

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
      }
    `,
  ],
  host: {
    "[style.flex]": "flex()",
    "[style.overflow]": "fill() ? 'auto' : undefined",
    "[style.padding-left]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
    "[style.padding-right]": "parent.padding() != null ? 'var(--gap-' + parent.padding() +')' : undefined",
  },
})
export class SdFlexItemControl {
  parent = inject(SdFlexControl);
  min = input(false, { transform: transformBoolean });
  fill = input(false, {
    transform: (value: boolean | "" | undefined | number): boolean | number => {
      return typeof value === "number" ? value : value != null && value !== false;
    },
  });

  flex = $computed<string | undefined>(() => {
    if (typeof this.fill() === "number") {
      return `1 ${this.fill()} auto`;
    } else {
      return Boolean(this.fill()) ? "1 1 auto" : this.min() ? "0 0 0" : undefined;
    }
  });
}
