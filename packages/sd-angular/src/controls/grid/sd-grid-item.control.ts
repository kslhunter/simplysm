import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdGridControl } from "./sd-grid.control";
import { $computed } from "../../utils/bindings/$computed";

// TODO: style로 변경
@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-grid-item {
        height: 100%;
      }
    `,
  ],
  template: `
    <ng-content />
  `,
  host: {
    "[style.grid-column-end]": "styleGridColumnEnd()",
  },
})
export class SdGridItemControl {
  #parentControl = inject(SdGridControl);

  colSpan = input.required<number>();
  colSpanSm = input<number>();
  colSpanXs = input<number>();
  colSpanXxs = input<number>();

  styleGridColumnEnd = $computed(() => {
    const parentWidth = this.#parentControl.offsetWidth();
    if (parentWidth < 800) {
      return `span ${this.colSpanXxs() ?? this.colSpanXs() ?? this.colSpanSm() ?? this.colSpan()}`;
    } else if (parentWidth < 1024) {
      return `span ${this.colSpanXs() ?? this.colSpanSm() ?? this.colSpan()}`;
    } else if (parentWidth < 1280) {
      return `span ${this.colSpanSm() ?? this.colSpan()}`;
    } else {
      return `span ${this.colSpan()}`;
    }
  });
}
