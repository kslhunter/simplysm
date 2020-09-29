import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Input, Optional } from "@angular/core";
import {
  FlipProp,
  FontawesomeObject,
  parse,
  PullProp,
  RotateProp,
  SizeProp,
  text,
  TextParams,
  Transform
} from "@fortawesome/fontawesome-svg-core";
import { SdIconLayerTextBaseControlBase } from "../../commons/SdIconLayerTextBaseControlBase";
import { ISdIconProps, objectWithKey, sdIconClassList } from "../../commons/SdIconUtils";
import { SdInputValidate } from "../../commons/SdInputValidate";
import { SdIconLayerControl } from "./SdIconLayerControl";
import { DomSanitizer } from "@angular/platform-browser";

@Component({
  selector: "sd-icon-layer-text",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  styles: [/* language=SCSS */ `
    sd-icon-layer-text {
      &[sd-fixed-width=true] {
        display: inline-block;
        width: 1.25em;
      }
    }
  `]
})
export class SdIconLayerTextControl extends SdIconLayerTextBaseControlBase {
  @Input()
  @SdInputValidate(Boolean)
  public spin?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public pulse?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["horizontal", "vertical", "both"]
  })
  public flip?: FlipProp;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

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
  @SdInputValidate(Boolean)
  public listItem?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: [90, 180, 270]
  })
  public rotate?: RotateProp;

  @Input("fixedWidth")
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-fixed-width")
  public fixedWidth?: boolean;

  @Input()
  public transform?: string | Transform;

  @HostBinding("class.ng-fa-layers-text")
  public classBoolean = true;

  public constructor(@Inject(forwardRef(() => SdIconLayerControl)) @Optional() parent: SdIconLayerControl | undefined,
                     sanitizer: DomSanitizer) {
    super(parent, sanitizer);
  }

  protected updateParams(): void {
    const classOpts: ISdIconProps = {
      flip: this.flip,
      spin: this.spin,
      pulse: this.pulse,
      border: this.border,
      inverse: this.inverse,
      listItem: this.listItem,
      size: this.size ?? undefined,
      pull: this.pull ?? undefined,
      rotate: this.rotate ?? undefined,
      fixedWidth: this.fixedWidth
    };

    const classes = objectWithKey("classes", [...sdIconClassList(classOpts), ...(this.classes ?? [])]);
    const parsedTransform = typeof this.transform === "string" ? parse.transform(this.transform) : this.transform;
    const transform = objectWithKey("transform", parsedTransform);

    this.params = {
      ...transform,
      ...classes,
      title: this.title,
      styles: this.styles
    };
  }

  protected renderFontawesomeObject(content: string, params?: TextParams): FontawesomeObject {
    return text(content, params);
  }
}