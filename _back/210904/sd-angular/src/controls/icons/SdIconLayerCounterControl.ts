import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Optional } from "@angular/core";
import { counter, CounterParams, FontawesomeObject } from "@fortawesome/fontawesome-svg-core";
import { SdIconLayerTextBaseControlBase } from "./SdIconLayerTextBaseControlBase";
import { SdIconLayerControl } from "./SdIconLayerControl";
import { DomSanitizer } from "@angular/platform-browser";

/**
 * Fontawesome layers counter.
 */
@Component({
  selector: "sd-icon-layer-counter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ""
})
export class SdIconLayerCounterControl extends SdIconLayerTextBaseControlBase {
  @HostBinding("class.ng-fa-layers-counter")
  public classBoolean = true;

  public constructor(@Inject(forwardRef(() => SdIconLayerControl)) @Optional() parent: SdIconLayerControl | undefined,
                     sanitizer: DomSanitizer) {
    super(parent, sanitizer);
  }

  protected updateParams(): void {
    this.params = {
      title: this.title,
      classes: this.classes,
      styles: this.styles
    };
  }

  protected renderFontawesomeObject(content: string | number, params?: CounterParams): FontawesomeObject {
    return counter(content, params);
  }
}
