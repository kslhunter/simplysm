import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/**
 * 카드 컨트롤
 * 
 * 예제:
 * ```html
 * <sd-card>
 *   카드 내용
 * </sd-card>
 * ```
 * 
 * 카드 컨트롤은 콘텐츠를 담을 수 있는 컨테이너 컴포넌트입니다.
 * - 흰색 배경과 그림자 효과가 적용됩니다
 * - hover 시 그림자가 강조됩니다
 * - 모바일 환경에서는 그림자 효과가 제거됩니다
 * - 페이드인 애니메이션이 적용됩니다
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
