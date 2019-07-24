import {forwardRef, HostBinding, Inject, Injectable, Input, OnChanges, Optional, SimpleChanges} from "@angular/core";
import {FontawesomeObject, Styles, TextParams} from "@fortawesome/fontawesome-svg-core";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {faWarnIfParentNotExist} from "@fortawesome/angular-fontawesome/shared/errors/warn-if-parent-not-exist";
import {SdIconLayerControl} from "./SdIconLayerControl";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

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

  public constructor(@Inject(forwardRef(() => SdIconLayerControl))
                     @Optional()
                     private readonly _parent: SdIconLayerControl,
                     private readonly _sanitizer: DomSanitizer) {
    faWarnIfParentNotExist(this._parent, "SdIconLayerControl", this.constructor.name);
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