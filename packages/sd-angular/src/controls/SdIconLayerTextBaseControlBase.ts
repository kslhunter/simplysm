import { forwardRef, HostBinding, Inject, Injectable, Input, OnChanges, Optional, SimpleChanges } from "@angular/core";
import { FontawesomeObject, Styles, TextParams } from "@fortawesome/fontawesome-svg-core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { SdIconLayerControl } from "./SdIconLayerControl";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Injectable({ providedIn: null })
export abstract class SdIconLayerTextBaseControlBase implements OnChanges {
  @Input()
  @SdInputValidate(String)
  protected content?: string;

  @Input()
  @SdInputValidate(String)
  public title?: string;

  @Input()
  protected styles?: Styles;

  @Input()
  @SdInputValidate(Array)
  public classes?: string[] = [];

  @HostBinding("innerHTML")
  public renderedHTML?: SafeHtml;

  protected params?: TextParams;

  public constructor(@Inject(forwardRef(() => SdIconLayerControl))
                     @Optional()
                     private readonly _parent: SdIconLayerControl | undefined,
                     private readonly _sanitizer: DomSanitizer) {
    if (this._parent === undefined) {
      throw new Error(this.constructor.name + "는 SdIconLayerControl 의 하위에만 사용될 수 있습니다");
    }
  }

  // eslint-disable-next-line @angular-eslint/contextual-lifecycle
  public ngOnChanges(changes: SimpleChanges): void {
    if (Object.keys(changes).length > 0) {
      this.updateParams();
      this._updateContent();
    }
  }

  protected abstract updateParams(): void;

  protected abstract renderFontawesomeObject(content: string | number, params?: TextParams): FontawesomeObject;

  private _updateContent(): void {
    this.renderedHTML = this._sanitizer.bypassSecurityTrustHtml(
      this.renderFontawesomeObject(this.content ?? "", this.params).html.join("\n")
    );
  }
}
