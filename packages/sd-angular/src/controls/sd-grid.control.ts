import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { useResizeManager } from "../utils/managers/use-resize-manager";
import { $computed } from "../utils/bindings/$computed";

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
  private _size = useResizeManager();

  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  styleGap = $computed(() => (this.gap() != null ? "var(--gap-" + this.gap() + ")" : undefined));
  offsetWidth = $computed(() => this._size.offsetWidth());
}
