import {forwardRef, HostBinding, Inject, Injectable, Input, OnChanges, Optional, SimpleChanges} from "@angular/core";
import {FontawesomeObject, Styles, TextParams} from "@fortawesome/fontawesome-svg-core";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdIconLayerControl} from "./SdIconLayerControl";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {Logger} from "@simplysm/sd-core";

@Injectable()
export abstract class SdIconLayerTextBaseControl implements OnChanges {
  @Input()
  @SdTypeValidate(String)
  protected content?: string;

  @Input()
  @SdTypeValidate(String)
  public title?: string;

  @Input()
  protected styles?: Styles;

  @Input()
  @SdTypeValidate(Array)
  public classes?: string[] = [];

  @HostBinding("innerHTML")
  public renderedHTML?: SafeHtml;

  protected params?: TextParams;

  private readonly _logger = new Logger("@simplysm/sd-angular", "SdIconLayerTextBaseControl");

  public constructor(@Inject(forwardRef(() => SdIconLayerControl))
                     @Optional()
                     private readonly _parent: SdIconLayerControl,
                     private readonly _sanitizer: DomSanitizer) {
    if (!this._parent) {
      this._logger.error(this.constructor.name + "는 SdIconLayerControl 의 하위에만 사용될 수 있습니다");
    }
  }

  // tslint:disable-next-line:contextual-lifecycle
  public ngOnChanges(changes: SimpleChanges): void {
    if (changes) {
      this.updateParams();
      this.updateContent();
    }
  }

  protected abstract updateParams(): void;

  protected abstract renderFontawesomeObject(content: string | number, params?: TextParams): FontawesomeObject;

  private updateContent(): void {
    this.renderedHTML = this._sanitizer.bypassSecurityTrustHtml(
      this.renderFontawesomeObject(this.content || "", this.params).html.join("\n")
    );
  }
}