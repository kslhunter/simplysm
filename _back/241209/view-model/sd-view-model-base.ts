import { ISdSheetColumnOrderingVM } from "../../controls/sheet/sd-sheet.control";
import { TSdExcelValueType } from "@simplysm/sd-excel";
import { DateTime } from "@simplysm/sd-core-common";
import { Signal } from "@angular/core";

export const SD_VIEW_MODEL_SHEET_FILTER = Symbol();
export const SD_VIEW_MODEL_SHEET_ITEM = Symbol();
export const SD_VIEW_MODEL_DETAIL_DATA = Symbol();

/**
 * 뷰모델의 추상 클래스입니다.
 * 
 * 데이터 조회, 수정, 삭제 등의 기본적인 CRUD 작업을 위한 표준화된 인터페이스를 제공합니다.
 * 
 * - 시트 형태의 데이터 목록 조회 및 필터링
 * - 상세 데이터 조회 및 저장 
 * - 엑셀 데이터 내보내기/가져오기
 * - 데이터 삭제 및 복원
 * - 권한 관리
 * 
 * ```typescript
 * class UserViewModel extends SdViewModelBase<IUserFilter, IUserItem, IUserDetail> {
 *   #sdAppStructure = inject(SdAppStructureProvider);
 * 
 *   key = "user";
 *   name = "사용자";
 *   viewCodes = ["base.user"];
 *   perms = $computed(() => this.#sdAppStructure.getViewPerms2(this.viewCodes, ["use", "edit"]));
 *   
 *   async search(filter: IUserFilter, ordering: ISdSheetColumnOrderingVM[], page: number, itemCountPerPage: number) {
 *     const result = await this.http.get("/api/users", { 
 *       params: { filter, ordering, page, itemCountPerPage } 
 *     });
 *     return result;
 *   }
 *   
 *   // ... 기타 필수 메서드 구현
 * }
 * ```
 */
export abstract class SdViewModelBase<
  SF extends Record<string, any> = Record<string, any>,
  SI extends ISdViewModelSheetItem = ISdViewModelSheetItem,
  DD extends ISdViewModelDetailData = ISdViewModelDetailData
> {
  [SD_VIEW_MODEL_SHEET_FILTER]!: SF;
  [SD_VIEW_MODEL_SHEET_ITEM]!: SI;
  [SD_VIEW_MODEL_DETAIL_DATA]!: DD;

  abstract key: string;
  abstract name: string;

  abstract viewCodes: string[];
  abstract perms: Signal<string[]>;

  abstract getExcelDataMatrix(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
  ): Promise<TSdExcelValueType[][]>;

  abstract search(
    filter: SF,
    ordering: ISdSheetColumnOrderingVM[],
    page: number,
    itemCountPerPage: number,
  ): Promise<{
    items: SI[],
    pageLength: number
  }>;

  abstract deletes(ids: number[]): Promise<void>;

  abstract restores(ids: number[]): Promise<void>;

  abstract uploadExcelDataTable(sheetName: string, dataTable: Record<string, any>[]): Promise<void>;

  abstract getDetailEmpty(): DD;

  abstract getDetail(id: number): Promise<DD>;

  abstract saveDetail(data: DD): Promise<void>;
}

export interface ISdViewModelSheetItem {
  id: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}

export interface ISdViewModelDetailData {
  id?: number;
  isDeleted?: boolean;
  lastModifyDateTime?: DateTime;
  lastModifierName?: string;
}