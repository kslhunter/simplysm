import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/hooks";
import { injectSizeSignals } from "../utils/dom-injects";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
      }
    `,
  ],
  host: {
    "[style.gap]": "styleGap()",
  },
})
export class SdGridControl {
  #size = injectSizeSignals();

  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  styleGap = $computed(() => (this.gap() != null ? "var(--gap-" + this.gap() + ")" : undefined));
  offsetWidth = $computed(() => this.#size.offsetWidth());
}
