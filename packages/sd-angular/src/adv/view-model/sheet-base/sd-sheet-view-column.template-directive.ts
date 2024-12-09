import { Directive, inject, input, TemplateRef } from "@angular/core";

/**
 * 시트 뷰의 컬럼을 정의하는 템플릿 디렉티브입니다.
 * 
 * 시트 데이터의 각 컬럼에 대한 표시 방식과 동작을 정의할 수 있게 해줍니다.
 * 
 * - 컬럼 키 설정 (필수)
 * - 컬럼 헤더 텍스트 설정
 * - 커스텀 셀 템플릿 정의
 * - 시트 뷰와 자동 연동
 * 
 * ```typescript
 * @Component({
 *   template: `
 *     <sd-sheet-view-base>
 *       <!-- columns -->
 *       <ng-template sd-sheet-view-column key="name" header="이름">
 *          <div class="p-xs-sm">
 *            {{ item.name }}
 *          </div>
 *       </ng-template>
 *       
 *       <ng-template sd-sheet-view-column key="status" [header]="['상태', '구분']">
 *          <div class="p-xs-sm">
 *            <sd-label [theme]="item.status === 'active' ? 'success' : 'warning'">
 *              {{ item.status === 'active' ? '활성' : '비활성' }}
 *            </sd-label>
 *          </div>
 *       </ng-template>
 * 
 *       <ng-template sd-sheet-view-column key="actions">
 *         <sd-button size="sm" (click)="onEditClick(item)">
 *           수정
 *         </sd-button>
 *       </ng-template>
 *     </sd-sheet-view-base>
 *   `
 * })
 * export class MySheetViewComponent {
 *   onEditClick(item: any): void {
 *     // 수정 처리
 *   }
 * }
 * ```
 */
@Directive({
  selector: "ng-template[sd-sheet-view-column]",
  standalone: true,
})
export class SdSheetViewColumnTemplateDirective {
  templateRef = inject(TemplateRef);

  key = input.required<string>();

  header = input<string | string[]>();
}