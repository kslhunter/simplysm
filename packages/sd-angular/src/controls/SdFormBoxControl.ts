import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * 폼 박스 컨트롤 컴포넌트
 * 
 * 폼 요소들을 그룹화하고 레이아웃을 관리하는 컨테이너 컴포넌트입니다.
 * 
 * 주요 기능:
 * - 다양한 레이아웃 지원 (cascade, inline, table, none)
 * - 라벨 너비 및 정렬 설정
 * - 반응형 디자인
 * 
 * @example
 * ```html
 * <sd-form-box 
 *   layout="cascade"
 *   labelWidth="120px"
 *   labelAlign="right">
 *   <sd-form-item label="이름">
 *     <input type="text">
 *   </sd-form-item>
 *   <sd-form-item label="이메일">
 *     <input type="email">
 *   </sd-form-item>
 * </sd-form-box>
 * ```
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
