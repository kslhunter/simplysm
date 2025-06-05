import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import {
  icon,
  IconDefinition,
  parse,
  RotateProp,
  SizeProp,
  Transform,
} from "@fortawesome/fontawesome-svg-core";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { $effect } from "../../utils/bindings/$effect";
import { injectElementRef } from "../../utils/injections/inject-element-ref";
import { transformBoolean } from "../../utils/type-tramsforms";


@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
})
export class SdIconControl {
  #sdNgConf = inject(SdAngularConfigProvider);

  #elRef = injectElementRef();

  icon = input<IconDefinition>();

  animation = input<
    | "beat"
    | "fade"
    | "beat-fade"
    | "bounce"
    | "flip"
    | "shake"
    | "spin"
    | "spin-reverse"
    | "spin-pulse"
    | "spin-pulse-reverse">();

  size = input<SizeProp>();
  rotate = input<RotateProp>();
  fixedWidth = input(false, { transform: transformBoolean });
  stackItemSize = input<"1x" | "2x">();
  transform = input<string | Transform>();

  constructor() {
    $effect(() => {
      const iconDef = this.icon() ?? this.#sdNgConf.icons.fallback;
      const renderedIcon = icon(iconDef, {
        transform: typeof this.transform() === "string"
          ? parse.transform(this.transform() as string)
          : this.transform() as Transform | undefined,
        classes: [
          this.fixedWidth() ? "fa-fw" : undefined,
          this.size() != null ? `fa-${this.size()}` : undefined,
          this.rotate() != null ? `fa-rotate-${this.rotate()}` : undefined,
          this.stackItemSize() != null ? `fa-stack-${this.stackItemSize()}` : undefined,
          ...this.animation() != null ? [
            !this.animation()!.startsWith("spin") ? `fa-${this.animation()}` : undefined,
            ["spin", "spin-reverse"].includes(this.animation()!) ? "fa-spin" : undefined,
            ["spin-reverse", "spin-pulse-reverse"].includes(this.animation()!)
              ? "fa-spin-reverse"
              : undefined,
            ...["spin-pulse", "spin-pulse-reverse"].includes(this.animation()!) ? [
              "fa-pulse",
              "fa-spin-pulse",
            ] : [],
          ] : [],
        ].filterExists(),
      });

      this.#elRef.nativeElement.innerHTML = renderedIcon.html.join("\n");
    });
  }
}
