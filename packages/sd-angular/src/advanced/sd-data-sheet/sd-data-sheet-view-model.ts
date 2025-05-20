import { WritableSignal } from "@angular/core";
import { ISdSortingDef } from "../../utils/managers/sd-sorting-manager";

export interface ISdDataSheetViewModel<F extends Record<string, any>, I, K> {
  key: string;
  name: string;
  viewCodes: string[];

  filter: TFilterSignals<F>;

  items: WritableSignal<I[]>;

  getKey(item: I): K;

  getIsDeleted(item: I): boolean;

  searchAsync(
    type: "excel" | "sheet",
    lastFilter: F,
    sortingDefs: ISdSortingDef[],
    page?: number,
  ): Promise<{ items: I[], pageLength?: number; }>;

  editItemAsync?(item?: I): Promise<boolean>;

  toggleDeletesAsync?(selectedItems: I[], del: boolean): Promise<void>;

  downloadExcelAsync?(items: I[]): Promise<void>;

  uploadExcelAsync?(file: File): Promise<void>;
}

export type TFilterSignals<F> = { [P in keyof F]: WritableSignal<F[P]> };