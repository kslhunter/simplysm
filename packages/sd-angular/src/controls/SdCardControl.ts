import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/**
 * 카드 컴포넌트
 * 
 * 콘텐츠를 카드 형태로 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-card>
 *   카드 콘텐츠
 * </sd-card>
 * 
 * <!-- 중첩 사용 -->
 * <sd-card>
 *   <sd-card>
 *     중첩된 카드
 *   </sd-card>
 * </sd-card>
 * 
 * <!-- 다른 컴포넌트와 함께 사용 -->
 * <sd-card>
 *   <h3>카드 제목</h3>
 *   <p>카드 내용</p>
 *   <sd-button>버튼</sd-button>
 * </sd-card>
 * ```
 * 
 * @remarks
 * - 콘텐츠를 카드 형태의 컨테이너로 감싸서 표시합니다
 * - 그림자 효과로 입체감을 표현합니다
 * - hover 시 그림자가 강조되어 상호작용을 나타냅니다
 * - 페이드인 및 슬라이드 애니메이션 효과가 적용됩니다
 * - 터치 디바이스에서는 그림자 효과가 제거됩니다
 * - 모서리가 둥글게 처리되어 있습니다
 */
@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-card {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      transition: box-shadow 0.3s ease-in-out;
      @include elevation(2);
      animation: sd-card  var(--animation-duration) ease-out;
      opacity: 0;
      transform: translateY(-1em);
      animation-fill-mode: forwards;

      &:hover,
      &:has(:focus) {
        @include elevation(6);
      }

      @media all and (pointer: coarse) {
        @include elevation(0);

        &:hover,
        &:has(:focus) {
          @include elevation(0);
        }
      }
    }
    
    @keyframes sd-card {
      from {
        opacity: 0;
        transform: translateY(-1em);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `
  ],
})
export class SdCardControl {
}
