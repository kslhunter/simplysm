import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef
} from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { Uuid } from "@simplysm/sd-core-common";

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
  public hidden?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useOrdering?: boolean;

  @ContentChild("cell", { static: true })
  public cellTemplateRef?: TemplateRef<{ item: any; index: number; edit: boolean; parent: any; depth?: number }>;

  @ContentChild("header", { static: true })
  public headerTemplateRef?: TemplateRef<{}>;

  @ContentChild("summary", { static: true })
  public summaryTemplateRef?: TemplateRef<{}>;

  // TYPE

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["select"]
  })
  public type?: "select";

  // SELECT

  @Input()
  @SdInputValidate(Array)
  public selectedItems?: any[];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();
}
