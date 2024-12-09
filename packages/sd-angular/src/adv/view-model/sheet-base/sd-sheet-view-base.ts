import { Directive, InputSignal, ModelSignal, viewChild } from "@angular/core";
import { SD_VIEW_MODEL_SHEET_ITEM, SdViewModelBase } from "../sd-view-model-base";
import { SdSheetViewBaseControl } from "./sd-sheet-view-base.control";

/**
 * 시트 뷰의 기본 기능을 제공하는 추상 클래스입니다.
 * 
 * 시트 형태의 데이터 목록을 표시하고 관리하기 위한 공통 기능을 제공해야 합니다.
 * 
 * - 데이터 목록 표시 및 새로고침
 * - 단일/다중 항목 선택 기능
 * - 선택된 항목 관리
 * - 뷰모델과의 연동
 * 
 * ```typescript
 * @Component({
 *   template: `
 *     <sd-sheet-view-base>
 *       <!-- columns -->
 *       <ng-template sd-sheet-view-column key="name" header="이름">
 *         <div class="p-xs-sm">
 *           {{ item.name }}
 *         </div>
 *       </ng-template>
 *       
 *       <ng-template sd-sheet-view-column key="status" header="상태">
 *         <div class="p-xs-sm">
 *           {{ item.status }}
 *         </div>
 *       </ng-template>
 *     </sd-sheet-view-base>
 *   `
 * })
 * export class UserSheetViewComponent extends SdSheetViewBase<UserViewModel> {
 *   viewModel = inject(UserViewModel);
 *   selectMode = input<"single" | "multi">("single");
 *   selectedItems = model<UserItem[]>([]);
 *   items = model<UserItem[]>([]);
 * }
 * ```
 */
@Directive()
export abstract class SdSheetViewBase<VM extends SdViewModelBase> {
  abstract viewModel: VM;

  abstract selectMode: InputSignal<"single" | "multi" | undefined>;

  abstract selectedItems: ModelSignal<VM[typeof SD_VIEW_MODEL_SHEET_ITEM][]>;

  abstract items: ModelSignal<VM[typeof SD_VIEW_MODEL_SHEET_ITEM][]>;

  baseControl = viewChild.required(SdSheetViewBaseControl);

  refresh() {
    this.baseControl().onRefreshButtonClick();
  }
}