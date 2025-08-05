import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

/** @deprecated .note */
@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styleUrl: "sd-note.scss",
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
  },
})
export class SdNoteControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: transformBoolean });
}
