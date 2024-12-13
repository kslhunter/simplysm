import { Signal } from "@angular/core";
import { DateTime } from "@simplysm/sd-core-common";
import { ISdSheetColumnOrderingVM } from "../../controls/sheet/sd-sheet.control";
import { TSdExcelValueType } from "@simplysm/sd-excel";

export const SD_VM_DETAIL_DATA = Symbol();
export const SD_VM_SHEET_FILTER = Symbol();
export const SD_VM_SHEET_ITEM = Symbol();

export abstract class SdViewModelAbstract<
  DD extends ISdViewModelDetailData = ISdViewModelDetailData,
  SF extends Record<string, any> = Record<string, any>,
  SI extends ISdViewModelSheetItem = ISdViewModelSheetItem,
> {
  [SD_VM_DETAIL_DATA]!: DD;
  [SD_VM_SHEET_FILTER]!: SF;
  [SD_VM_SHEET_ITEM]!: SI;

  abstract key: string;
  abstract name: string;

  abstract viewCodes: string[];
  abstract perms: Signal<string[]>;

  abstract getDetailAsync(id: number): Promise<DD>;

  abstract getExcelDataMatrixAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
  ): Promise<TSdExcelValueType[][]>;

  abstract searchAsync(filter: SF, ordering: ISdSheetColumnOrderingVM[]): Promise<{
    items: SI[];
  }>;
  abstract searchAsync(filter: SF, ordering: ISdSheetColumnOrderingVM[], page: number): Promise<{
    items: SI[];
    pageLength: number;
    summary?: Partial<SI>;
  }>;

  abstract changeDeleteStatesAsync(ids: number[], del: boolean): Promise<void>;

  abstract uploadExcelDataTable(
    wsName: string,
    wsdt: Record<string, TSdExcelValueType>[],
  ): Promise<void>;

  abstract upsertAsync(data: DD): Promise<void>;
}

export interface ISdViewModelDetailData {
  id?: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}

export interface ISdViewModelSheetItem {
  id: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}