import {FaIconComponent, FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {Component, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'sd-icon',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule
  ],
  template: ``,
})
export class SdIconControl extends FaIconComponent {
  @Input({transform: coercionBoolean})
  override fixedWidth = false;
}