import {Component, HostBinding} from "@angular/core";
import {counter, CounterParams, FontawesomeObject} from "@fortawesome/fontawesome-svg-core";
import {SdIconLayerTextBaseControl} from "./SdIconLayerTextBaseControl";

/**
 * Fontawesome layers counter.
 */
@Component({
  selector: "sd-icon-layer-counter",
  template: ""
})
export class SdIconLayerCounterControl extends SdIconLayerTextBaseControl {
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