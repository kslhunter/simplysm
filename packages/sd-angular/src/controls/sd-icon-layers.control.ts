import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/hooks";
import { type SizeProp } from "@fortawesome/fontawesome-svg-core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-icon-layers",
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
export class SdIconLayersControl {
  size = input<SizeProp>();
  fixedWidth = input(false, { transform: transformBoolean });

  currentClass = $computed(() => [
    "fa-layers",
    this.size() != null ? `fa-${this.size()}` : undefined,
    this.fixedWidth() ? `fa-fw` : undefined,
  ].filterExists().join(" "));
}