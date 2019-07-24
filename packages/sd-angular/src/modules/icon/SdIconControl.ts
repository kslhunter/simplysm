import {Component, HostBinding, Input, OnChanges, SimpleChanges} from "@angular/core";
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
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {sdIconNames} from "../../commons/sdIconNames";
import {Logger} from "@simplysm/sd-core";
import {ISdIconProps, objectWithKey, sdIconClassList, sdIconNormalizeIconSpec} from "./SdIconUtils";
import {fab} from "@fortawesome/free-brands-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fas} from "@fortawesome/free-solid-svg-icons";

library.add(fas, far, fab);

@Component({
  selector: "sd-icon",
  template: ``,
  styles: [/* language=SCSS */ `
    sd-icon {
      &[sd-fw=true] {
        display: inline-block;
        width: 1.25em;
      }
    }
  `]
})
export class SdIconControl implements OnChanges {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: sdIconNames
  })
  public icon?: IconName;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["solid", "regular", "brands"],
    notnull: true
  })
  public type = "solid";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-fw")
  public fw?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: sdIconNames
  })
  public mask?: IconName;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["solid", "regular", "brands"],
    notnull: true
  })
  public maskType = "solid";

  @Input()
  @SdTypeValidate(String)
  public title?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public spin?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public pulse?: boolean;

  @Input()
  public styles?: Styles;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["horizontal", "vertical", "both"]
  })
  public flip?: FlipProp;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["left", "right"]
  })
  public pull?: PullProp;

  @Input()
  @SdTypeValidate(Boolean)
  public border?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public inverse?: boolean;

  @Input()
  @SdTypeValidate([String, Boolean])
  public symbol?: FaSymbol;

  @Input()
  @SdTypeValidate(Boolean)
  public listItem?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: [90, 180, 270]
  })
  public rotate?: RotateProp;

  @Input()
  @SdTypeValidate(Array)
  public classes?: string[] = [];

  @Input()
  public transform?: string | Transform;

  @HostBinding("innerHTML")
  public renderedIconHTML?: SafeHtml;

  @HostBinding("class.ng-fa-icon")
  public classBoolean = true;

  private readonly _logger = new Logger("@simplysm/sd-angular", "SdIconControl");

  public constructor(private readonly _sanitizer: DomSanitizer) {
  }

  private _iconProp?: IconProp;
  private _iconSpec?: IconLookup;
  private _maskProp?: IconProp;
  private _params?: IconParams;
  private _faIcon?: Icon;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes) {
      // iconProp 업데이트
      this._iconProp = this.icon ? [
        this.type === "brands" ? "fab" : this.type === "regular" ? "far" : "fas",
        this.icon
      ] : undefined;

      // markProp 업데이트
      this._maskProp = this.mask ? [
        this.maskType === "brands" ? "fab" : this.maskType === "regular" ? "far" : "fas",
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
        size: this.size || undefined,
        pull: this.pull || undefined,
        rotate: this.rotate || undefined,
        fixedWidth: this.fw
      };

      const classes = objectWithKey("classes", [...sdIconClassList(classOpts), ...(this.classes || [])]);
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
      this._faIcon = icon(this._iconSpec!, this._params);

      // 렌더링
      if (!this._iconSpec) {
        this._logger.error("아이콘을 찾을 수 없습니다");
      }

      if (this._iconSpec && !this._faIcon) {
        this._logger.error("아이콘을 찾을 수 없습니다 (iconName=" + this._iconSpec.iconName + ", prefix=" + this._iconSpec.prefix + ")");
      }

      this.renderedIconHTML = this._sanitizer.bypassSecurityTrustHtml(
        this._faIcon
          ? this._faIcon.html.join("\n")
          : "<svg class=\"" + config.replacementClass + "\" viewBox=\"0 0 448 512\"></svg><!--icon not found-->"
      );
    }
  }
}