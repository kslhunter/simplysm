import { Signal } from "@angular/core";
import { DateTime } from "@simplysm/sd-core-common";
import { ISdSheetColumnOrderingVM } from "../../controls/sheet/sd-sheet.control";
import { TSdExcelValueType } from "@simplysm/sd-excel";

export interface ISdViewModel<
  DD extends ISdViewModelDetailData = ISdViewModelDetailData,
  SF extends Record<string, any> = Record<string, any>,
  SI extends ISdViewModelSheetItem = ISdViewModelSheetItem,
> {
  key: string;
  name: string;

  viewCodes: string[];
  perms: Signal<string[]>;

  getDetailAsync(id: number): Promise<DD>;

  getExcelDataMatrixAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
  ): Promise<TSdExcelValueType[][]>;

  searchAsync(filter: SF, ordering: ISdSheetColumnOrderingVM[]): Promise<{
    items: SI[];
  }>;
  searchAsync(filter: SF, ordering: ISdSheetColumnOrderingVM[], page: number): Promise<{
    items: SI[];
    pageLength: number;
    summary?: Partial<SI>;
  }>;

  changeDeleteStatesAsync(ids: number[], del: boolean): Promise<void>;

  uploadExcelDataTable(
    wsName: string,
    wsdt: Record<string, TSdExcelValueType>[],
  ): Promise<void>;

  upsertAsync(data: DD): Promise<void>;
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

export type TSdViewModelGenericTypes<VM extends ISdViewModel> = VM extends ISdViewModel<infer A, infer B, infer C>
  ? { DD: A, SF: B, SI: C }
  : never;
