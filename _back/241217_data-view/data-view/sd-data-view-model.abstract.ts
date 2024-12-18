import {
  contentChild,
  contentChildren,
  Directive,
  input,
  Signal,
  TemplateRef,
} from "@angular/core";
import { SdSheetColumnDirective } from "../../controls/sheet/sd-sheet-column.directive";
import { transformBoolean } from "../../utils/tramsforms";
import { $signal } from "../../utils/$hooks";
import { DateTime, ObjectUtil } from "@simplysm/sd-core-common";
import { ISdSheetColumnOrderingVM } from "../../controls/sheet/sd-sheet.control";
import { TSdExcelValueType } from "@simplysm/sd-excel";

@Directive()
export abstract class SdDataViewModelAbstract<
  DD extends ISdDataViewModelDetailData = ISdDataViewModelDetailData,
  SF extends Record<string, any> = Record<string, any>,
  SI extends ISdDataViewModelSheetItem = ISdDataViewModelSheetItem,
  P extends Record<string, any> = Record<string, any>
> {
  //-- commons

  abstract key: string;
  abstract name: string;

  abstract viewCodes: string[];
  abstract perms: Signal<string[]>;

  params = $signal<P>();

  //-- sheet

  sheetFilterControls = contentChildren(SdDataViewFilterDirective);
  sheetColumnControls = contentChildren(SdDataViewColumnDirective);

  filter = $signal<SF>(this.getDefaultFilter());
  lastFilter = $signal(ObjectUtil.clone(this.filter()));

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSheetColumnOrderingVM[]>([]);

  items = $signal<SI[]>([]);
  selectedItems = $signal<SI[]>([]);

  abstract getDefaultFilter(): SF;

  abstract refreshItemsAsync(): Promise<void>;

  abstract getExcelDataMatrixAsync(): Promise<TSdExcelValueType[][]>;

  abstract deleteSelectedItemsAsync(): Promise<void>;

  abstract restoreSelectedItemsAsync(): Promise<void>;

  abstract uploadExcelDataTableAsync(
    wsName: string,
    wsdt: Record<string, TSdExcelValueType>[],
  ): Promise<void>;

  //-- data
  detailDataTemplateRef = contentChild<any, TemplateRef<void>>("detail", { read: TemplateRef });

  data = $signal<DD>(this.getDefaultData());

  abstract getDefaultData(): DD;

  abstract refreshDataAsync(): Promise<void>;

  abstract deleteDataAsync(): Promise<void>;

  abstract restoreDataAsync(): Promise<void>;

  abstract upsertDataAsync(): Promise<void>;
}

@Directive({
  selector: "sd-data-view-filter",
  standalone: true,
})
export class SdDataViewFilterDirective {
  label = input<string>();
  labelTooltip = input<string>();

  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });
  contentTemplateRef = contentChild.required<any, TemplateRef<void>>(
    "content",
    { read: TemplateRef },
  );
}


@Directive({
  selector: "sd-data-view-column",
  standalone: true,
})
export class SdDataViewColumnDirective extends SdSheetColumnDirective<any> {
  override useOrdering = input(true, { transform: transformBoolean });
  override resizable = input(true, { transform: transformBoolean });
}


export interface ISdDataViewModelDetailData {
  id?: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}

export interface ISdDataViewModelSheetItem {
  id: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}

export type TSdDataViewModelGenericTypes<VM extends SdDataViewModelAbstract> = VM extends SdDataViewModelAbstract<infer DD, infer SF, infer SI>
  ? { DD: DD, SF: SF, SI: SI }
  : never;