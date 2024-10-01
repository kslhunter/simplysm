import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { injectElementResize } from "../utils/injectElementResize";
import { $computed } from "../utils/$hooks";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content /> `,
  styles: [
    /* language=SCSS */ `
      sd-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
      }
    `,
  ],
})
export class SdGridControl {
  #size = injectElementResize();

  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  offsetWidth$ = $computed(() => this.#size.width.value);

  constructor() {
    $hostBinding(
      "style.gap",
      $computed(() => (this.gap() != null ? "var(--gap-" + this.gap() + ")" : undefined)),
    );
  }
}
