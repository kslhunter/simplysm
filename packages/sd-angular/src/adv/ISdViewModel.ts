import { Signal } from "@angular/core";
import { ISdSheetColumnOrderingVM } from "../controls/sheet/sd-sheet.control";
import { DateTime } from "@simplysm/sd-core-common";
import { TSdExcelValueType } from "@simplysm/sd-excel";

export interface ISdViewModel<
  DD extends ISdViewModelDetailData = ISdViewModelDetailData,
  SF extends Record<string, any> = Record<string, any>,
  SI extends ISdViewModelSheetItem = ISdViewModelSheetItem,
  SS extends Record<string, any> = Record<string, any>
> {
  key: string;
  name: string;

  viewCodes: string[];
  perms: Signal<string[]>;

  getDetailAsync(id: number): Promise<DD>;

  searchAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
  ): Promise<{
    items: SI[]
  }>;

  searchAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
    page: number,
  ): Promise<{
    items: SI[],
    pageLength: number,
    summary?: SS
  }>;

  searchAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
    page?: number,
  ): Promise<{
    items: SI[],
    pageLength: number,
    summary?: SS
  }>;

  getExcelDataMatrixAsync(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
  ): Promise<TSdExcelValueType[][]>;

  upsertsAsync(changes: { data: DD, orgData?: DD }[], logTypeText?: string): Promise<void>;

  toggleDeletesAsync(ids: number[], del: boolean): Promise<void>;

  uploadExcelDataTableAsync(
    wsName: string,
    wsdt: Record<string, TSdExcelValueType>[],
  ): Promise<void>;
}

export type TSdViewModelGenericTypes<VM extends ISdViewModel> = VM extends ISdViewModel<infer DD, infer SF, infer SI, infer SS>
  ? { DD: DD, SF: SF, SI: SI, SS: SS }
  : never;


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