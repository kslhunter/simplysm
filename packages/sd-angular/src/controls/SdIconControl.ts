import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { coercionBoolean } from "../utils/commons";

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: ``,
})
export class SdIconControl extends FaIconComponent {
  @Input({ transform: coercionBoolean }) override fixedWidth = false;
  @Input({ transform: coercionBoolean }) override inverse = false;
}
