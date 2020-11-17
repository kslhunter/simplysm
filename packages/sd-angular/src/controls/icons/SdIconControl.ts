import { ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges, SimpleChanges } from "@angular/core";
import {
  config,
  FaSymbol,
  FlipProp,
  icon,
  Icon,
  IconLookup,
  IconName,
  IconParams,
  IconProp,
  library,
  parse,
  PullProp,
  RotateProp,
  SizeProp,
  Styles,
  Transform
} from "@fortawesome/fontawesome-svg-core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { ISdIconProps, objectWithKey, sdIconClassList, sdIconNormalizeIconSpec, sdIconNames } from "../../commons";
import { fal } from "@fortawesome/pro-light-svg-icons";
import { far } from "@fortawesome/pro-regular-svg-icons";
import { fas } from "@fortawesome/pro-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { fad } from "@fortawesome/pro-duotone-svg-icons";
import { SdInputValidate } from "../../decorators/SdInputValidate";

library.add(fal, fas, far, fab, fad);

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [/* language=SCSS */ `
    :host {
      &[sd-fixed-width=true] {
        /deep/ > svg {
          width: 1.25em;
        }
      }
    }
  `]
})
export class SdIconControl implements OnChanges {
  @Input()
  @SdInputValidate({
    type: String,
    includes: sdIconNames
  })
  public icon?: IconName;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["fas", "far", "fab", "fal", "fad"],
    notnull: true
  })
  public type: "fas" | "far" | "fab" | "fal" | "fad" = "fas";

  @Input("fixedWidth")
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-fixed-width")
  public fixedWidth?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdIconNames
  })
  public mask?: IconName;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["fas", "far", "fab", "fal", "fad"],
    notnull: true
  })
  public maskType: "fas" | "far" | "fab" | "fal" | "fad" = "fas";

  @Input()
  @SdInputValidate(String)
  public title?: string;

  @Input()
  @SdInputValidate(Boolean)
  public spin?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public pulse?: boolean;

  @Input()
  public styles?: Styles;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["horizontal", "vertical", "both"]
  })
  public flip?: FlipProp;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["left", "right"]
  })
  public pull?: PullProp;

  @Input()
  @SdInputValidate(Boolean)
  public border?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public inverse?: boolean;

  @Input()
  @SdInputValidate([String, Boolean])
  public symbol?: FaSymbol;

  @Input()
  @SdInputValidate(Boolean)
  public listItem?: boolean;

  @Input()
  @SdInputValidate({
    type: Number,
    includes: [0, 90, 180, 270]
  })
  public rotate?: RotateProp;

  @Input()
  @SdInputValidate(Array)
  public classes?: string[] = [];

  @Input()
  public transform?: string | Transform;

  @HostBinding("innerHTML")
  public renderedIconHTML?: SafeHtml;

  @HostBinding("class.ng-fa-icon")
  public classBoolean = true;

  public constructor(private readonly _sanitizer: DomSanitizer) {
  }

  private _iconProp?: IconProp;
  private _iconSpec?: IconLookup;
  private _maskProp?: IconProp;
  private _params?: IconParams;
  private _faIcon?: Icon;

  public ngOnChanges(changes: SimpleChanges): void {
    if (Object.keys(changes).length > 0) {
      // iconProp 업데이트
      this._iconProp = this.icon !== undefined ? [
        this.type,
        this.icon
      ] : undefined;

      // markProp 업데이트
      this._maskProp = this.mask !== undefined ? [
        this.maskType,
        this.mask
      ] : undefined;

      // iconSpec 업데이트
      this._iconSpec = sdIconNormalizeIconSpec(this._iconProp);

      // params 업데이트
      const classOpts: ISdIconProps = {
        flip: this.flip,
        spin: this.spin,
        pulse: this.pulse,
        border: this.border,
        inverse: this.inverse,
        listItem: this.listItem,
        size: this.size,
        pull: this.pull,
        rotate: this.rotate,
        fixedWidth: this.fixedWidth
      };

      const classes = objectWithKey("classes", [...sdIconClassList(classOpts), ...(this.classes ?? [])]);
      const mask = objectWithKey("mask", sdIconNormalizeIconSpec(this._maskProp));
      const parsedTransform = typeof this.transform === "string" ? parse.transform(this.transform) : this.transform;
      const transform = objectWithKey("transform", parsedTransform);

      this._params = {
        title: this.title,
        ...transform,
        ...classes,
        ...mask,
        styles: this.styles,
        symbol: this.symbol
      };

      // icon 업데이트
      this._faIcon = this._iconSpec ? icon(this._iconSpec, this._params) : undefined;

      // 렌더링
      if (this.icon !== undefined) {
        if (!this._iconSpec) {
          throw new Error("아이콘을 찾을 수 없습니다");
        }

        if (!this._faIcon) {
          throw new Error("아이콘을 찾을 수 없습니다 (iconName=" + this._iconSpec.iconName + ", prefix=" + this._iconSpec.prefix + ")");
        }
      }

      this.renderedIconHTML = this._sanitizer.bypassSecurityTrustHtml(
        this._faIcon ?
          this._faIcon.html.join("\n") :
          "<svg class=\"" + config.replacementClass + "\" viewBox=\"0 0 448 512\"></svg><!--icon not found-->"
      );
    }
  }
}