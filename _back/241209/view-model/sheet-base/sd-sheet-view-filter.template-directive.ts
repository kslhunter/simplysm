import { Directive, inject, input, TemplateRef } from "@angular/core";

/**
 * 시트 뷰의 필터를 정의하는 템플릿 디렉티브입니다.
 * 
 * 시트 데이터를 필터링하기 위한 UI 요소를 정의할 수 있게 해줍니다.
 * 
 * - 필터 레이블 설정
 * - 커스텀 필터 UI 템플릿 정의
 * - 시트 뷰와 자동 연동
 * 
 * ```typescript
 * @Component({
 *   template: `
 *     <sd-sheet-view-base>
 *       <!-- filter -->
 *       <ng-template sd-sheet-view-filter label="검색어">
 *         <sd-textfield [(value)]="filter.searchText" />
 *       </ng-template>
 *       
 *       <ng-template sd-sheet-view-filter label="상태">
 *         <sd-select [(value)]="filter.status">
 *           <sd-select-item [value]="'active'">활성</sd-select-item>
 *           <sd-select-item [value]="'inactive'">비활성</sd-select-item>
 *         </sd-select>
 *       </ng-template>
 * 
 *       <!-- content -->
 *       ...
 *     </sd-sheet-view-base>
 *   `
 * })
 * export class MySheetViewComponent {
 *   filter = {
 *     searchText: "",
 *     status: "active"
 *   };
 * }
 * ```
 */

@Directive({
  selector: "ng-template[sd-sheet-view-filter]",
  standalone: true,
})
export class SdSheetViewFilterTemplateDirective {
  templateRef = inject(TemplateRef);

  label = input<string>();
}