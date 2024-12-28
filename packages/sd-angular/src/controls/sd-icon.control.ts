import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import {
  icon,
  IconDefinition,
  parse,
  RotateProp,
  SizeProp,
  Transform,
} from "@fortawesome/fontawesome-svg-core";
import { transformBoolean } from "../utils/type-tramsforms";
import { $effect } from "../utils/hooks";

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
        ].filterExists(),
      });

      this.#elRef.nativeElement.innerHTML = renderedIcon.html.join("\n");
    });
  }
}