import { Directive, input } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";
import { $computed } from "../utils/$hooks";

@Directive({
  selector: "[sdAnimationDelay]",
  standalone: true,
})
export class SdAnimationDelayDirective {
  sdAnimationDelay = input.required<number>();

  constructor() {
    $hostBinding(
      "style.animation-delay",
      $computed(() => "calc(var(--animation-duration) * " + this.sdAnimationDelay() + ")"),
    );
  }
}
