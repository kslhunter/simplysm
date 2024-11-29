import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * 폼 박스 컴포넌트
 * 
 * 폼 요소들을 그룹화하고 레이아웃을 관리하는 컨테이너 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 (cascade 레이아웃) -->
 * <sd-form-box>
 *   <sd-form-item label="이름">
 *     <sd-textfield></sd-textfield>
 *   </sd-form-item>
 *   <sd-form-item label="이메일">
 *     <sd-textfield></sd-textfield>
 *   </sd-form-item>
 * </sd-form-box>
 * 
 * <!-- 인라인 레이아웃 -->
 * <sd-form-box layout="inline">
 *   <sd-form-item label="검색어">
 *     <sd-textfield></sd-textfield>
 *   </sd-form-item>
 *   <sd-button>검색</sd-button>
 * </sd-form-box>
 * 
 * <!-- 테이블 레이아웃 -->
 * <sd-form-box layout="table" labelWidth="120px">
 *   <sd-form-item label="제목">
 *     <sd-textfield></sd-textfield>
 *   </sd-form-item>
 *   <sd-form-item label="내용">
 *     <sd-textarea></sd-textarea>
 *   </sd-form-item>
 * </sd-form-box>
 * ```
 * 
 * @remarks
 * - 다양한 레이아웃 스타일을 지원합니다 (cascade, inline, table, none)
 * - 라벨의 너비를 일괄적으로 설정할 수 있습니다
 * - 폼 아이템 간의 간격을 자동으로 조정합니다
 * - 반응형 디자인을 지원합니다
 * - 중첩된 폼 구조를 구성할 수 있습니다
 * - 폼 요소들의 정렬과 배치를 일관되게 관리합니다
 */
@Component({
  selector: "sd-form-box",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content> `,
  styles: [
    /* language=SCSS */ `
      sd-form-box {
        &[sd-layout="cascade"] {
          display: flex;
          flex-direction: column;
          gap: var(--gap-default);
        }

        &[sd-layout="table"] {
          display: table;
          width: 100%;
        }

        &[sd-layout="inline"] {
          display: inline-flex;
          flex-wrap: wrap;
          gap: var(--gap-sm);
        }

        &[sd-layout="none"] {
          display: contents;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-layout]": "layout()",
  },
})
export class SdFormBoxControl {
  /** 폼 박스의 레이아웃 스타일 (기본값: "cascade")
   * - cascade: 세로 방향으로 아이템을 배치
   * - inline: 가로 방향으로 아이템을 배치하며 자동 줄바꿈
   * - table: 테이블 형태로 아이템을 배치
   * - none: 레이아웃 스타일 없음
   */
  layout = input<"cascade" | "inline" | "table" | "none">("cascade");

  /** 라벨의 너비를 지정 (예: "120px") */
  labelWidth = input<string>();

  /** 라벨의 정렬 방식
   * - left: 왼쪽 정렬
   * - right: 오른쪽 정렬  
   * - center: 가운데 정렬
   */
  labelAlign = input<"left" | "right" | "center">();
}
