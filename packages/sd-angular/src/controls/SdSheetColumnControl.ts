import {ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";
import {Uuid} from "@simplysm/sd-core-common";

@Component({
  selector: "sd-sheet-column",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [/* language=SCSS */ `
    :host {
    }
  `]
})
export class SdSheetColumnControl {
  public guid = Uuid.new().toString();

  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input("width.px")
  @SdInputValidate({
    type: Number,
    notnull: true
  })
  public widthPixel = 120;

  @Input()
  @SdInputValidate(String)
  public group?: string;

  @Input()
  @SdInputValidate(String)
  public header?: string;

  @Input()
  @SdInputValidate(String)
  public tooltip?: string;

  @Input()
  @SdInputValidate(Boolean)
  public fixed?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public resizable?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useOrdering?: boolean;

  @ContentChild("cell", {static: true})
  public cellTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<{}>;

  @ContentChild("summary", {static: true})
  public summaryTemplateRef?: TemplateRef<{}>;
}