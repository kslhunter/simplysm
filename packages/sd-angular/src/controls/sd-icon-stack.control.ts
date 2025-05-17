import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SizeProp } from "@fortawesome/fontawesome-svg-core";
import { $computed } from "../utils/bindings/$computed";

@Component({
  selector: "sd-icon-stack",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  host: {
    "[class]": "currentClass()",
  },
})
export class SdIconStackControl {
  size = input<SizeProp>();

  currentClass = $computed(() => [
    "fa-stack",
    this.size() != null ? `fa-${this.size()}` : undefined,
  ].filterExists().join(" "));
}