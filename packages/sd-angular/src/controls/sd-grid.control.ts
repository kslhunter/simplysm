import { ChangeDetectionStrategy, Component, HostListener, input, ViewEncapsulation } from "@angular/core";
import { type ISdResizeEvent } from "../plugins/events/sd-resize.event-plugin";
import { $computed } from "../utils/bindings/$computed";
import { $signal } from "../utils/bindings/$signal";

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
  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  styleGap = $computed(() => (this.gap() != null ? "var(--gap-" + this.gap() + ")" : undefined));
  offsetWidth = $signal(0);

  @HostListener("sdResize", ["$event"])
  onResize(event: ISdResizeEvent) {
    if (!event.widthChanged) return;
    this.offsetWidth.set(event.contentRect.width);
  }
}
