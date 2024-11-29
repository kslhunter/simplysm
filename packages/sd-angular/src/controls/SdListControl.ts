import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 리스트 컨트롤
 *
 * 항목들을 리스트 형태로 표시하는 컨테이너 컴포넌트입니다.
 *
 * @example
 *
 * <sd-list>
 *   <sd-list-item>항목 1</sd-list-item>
 *   <sd-list-item>항목 2</sd-list-item>
 *   <sd-list-item>항목 3</sd-list-item>
 * </sd-list>
 *
 * <!-- inset 스타일 적용 -->
 * <sd-list [inset]="true">
 *   <sd-list-item>인셋 항목 1</sd-list-item>
 *   <sd-list-item>인셋 항목 2</sd-list-item>
 * </sd-list>
 *
 *
 * @remarks
 * - 기본적으로 흰색 배경과 둥근 모서리를 가진 컨테이너로 표시됩니다
 * - inset 속성을 true로 설정하면 배경과 테두리가 제거되어 주변 컨텐츠와 자연스럽게 어울립니다
 * - 내부에는 sd-list-item 컴포넌트를 배치하여 리스트 항목을 구성할 수 있습니다
 * - 중첩된 리스트 구조도 지원합니다
 */
@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-list {
        display: block;
        user-select: none;
        border-radius: var(--border-radius-default);
        overflow: hidden;
        background: white;
        width: 100%;

        &[sd-inset="true"] {
          border-radius: 0;
          background: transparent;

          sd-list {
            border-radius: 0;
            background: transparent;
          }
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.sd-inset]": "inset()",
  },
})
export class SdListControl {
  /**
   * 리스트의 inset 스타일 적용 여부를 설정합니다.
   * - true로 설정하면 배경과 테두리가 제거되어 주변 컨텐츠와 자연스럽게 어울립니다
   * - 기본값은 false입니다
   */
  inset = input(false, { transform: transformBoolean });}
