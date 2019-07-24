import {Component, HostBinding, Input} from "@angular/core";
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
import {SdIconLayerTextBaseControl} from "./SdIconLayerTextBaseControl";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {FaProps} from "@fortawesome/angular-fontawesome";
import {faClassList} from "@fortawesome/angular-fontawesome/shared/utils/classlist.util";
import {objectWithKey} from "@fortawesome/angular-fontawesome/shared/utils/object-with-keys.util";

@Component({
  selector: "sd-icon-layer-text",
  template: "",
  styles: [/* language=SCSS */ `
    sd-icon-layer-text {
      &[sd-fw=true] {
        display: inline-block;
        width: 1.25em;
      }
    }
  `]
})
export class SdIconLayerTextControl extends SdIconLayerTextBaseControl {
  @Input()
  @SdTypeValidate(Boolean)
  public spin?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public pulse?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["horizontal", "vertical", "both"]
  })
  public flip?: FlipProp;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

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
  @SdTypeValidate(Boolean)
  public listItem?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: [90, 180, 270]
  })
  public rotate?: RotateProp;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-fw")
  public fw?: boolean;

  @Input()
  public transform?: string | Transform;

  @HostBinding("class")
  public hostClass = "ng-fa-layers-text";

  protected updateParams(): void {
    const classOpts: FaProps = {
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

    const classes = objectWithKey("classes", [...faClassList(classOpts), ...(this.classes || [])]);
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