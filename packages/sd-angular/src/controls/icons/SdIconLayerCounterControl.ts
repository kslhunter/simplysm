import { ChangeDetectionStrategy, Component, HostBinding } from "@angular/core";
import { counter, CounterParams, FontawesomeObject } from "@fortawesome/fontawesome-svg-core";
import { SdIconLayerTextBaseControlBase } from "../../commons/SdIconLayerTextBaseControlBase";

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
