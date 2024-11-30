import { ChangeDetectionStrategy, Component, forwardRef, inject, ViewEncapsulation } from "@angular/core";
import { SdSidebarContainerControl } from "./SdSidebarContainerControl";
import { $computed } from "../utils/$hooks";

/**
 * 사이드바 컨트롤
 *
 * 사이드바 컨테이너 내에서 사용되는 사이드바 컴포넌트입니다.
 *
 * @example
 *
 * <sd-sidebar-container>
 *   <sd-sidebar>
 *     <!-- 사이드바 내용 -->
 *   </sd-sidebar>
 *   <sd-sidebar-content>
 *     <!-- 메인 콘텐츠 -->
 *   </sd-sidebar-content>
 * </sd-sidebar-container>
 *
 *
 * @remarks
 * - 사이드바는 항상 sd-sidebar-container 내부에서 사용되어야 합니다.
 * - 화면 크기에 따라 자동으로 반응형으로 동작합니다.
 * - 테마에 따라 다른 스타일이 적용됩니다.
 */
@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-sidebar {
        display: block;
        position: absolute;
        z-index: var(--z-index-sidebar);
        top: 0;
        left: 0;
        width: var(--sidebar-width);
        height: 100%;
        animation: sd-sidebar var(--animation-duration) ease-in;

        //-- 테마

        background: white;

        body.sd-theme-kiosk &,
        body.sd-theme-mobile & {
          border-top-right-radius: var(--gap-default);
          border-bottom-right-radius: var(--gap-default);
        }

        body.sd-theme-compact &,
        body.sd-theme-modern & {
          //background: var(--theme-grey-lightest);
          border-right: 1px solid var(--border-color-light);

          //box-shadow: inset -2px 0 8px rgba(0, 0, 0, .05);

          //@include elevation(16);

          &[sd-toggle="true"] {
            border-right: none;
          }
        }

        //-- 화면 크기

        @media not all and (max-width: 520px) {
          transition: transform 0.1s ease-out;

          &[sd-toggle="true"] {
            transform: translateX(-100%);
            transition: transform 0.1s ease-in;
          }
        }

        @media all and (max-width: 520px) {
          transition: transform 0.3s ease-in;
          transform: translateX(-100%);

          &[sd-toggle="true"] {
            transform: none;
            transition: transform 0.3s ease-out;
            @include elevation(16);
          }
        }
      }

      @keyframes sd-sidebar {
        from {
          opacity: 0;
          transform: translateX(-1em);
        }
      }
    `,
  ],
  template: `<ng-content></ng-content>`,
  host: {
    "[attr.sd-toggle]": "toggle()",
  },
})
export class SdSidebarControl {
  /** 부모 컨테이너 컨트롤 참조를 위한 의존성 주입 */
  #parentControl = inject<SdSidebarContainerControl>(forwardRef(() => SdSidebarContainerControl));

  /** 부모 컨테이너의 토글 상태를 반환하는 계산된 속성 */
  toggle = $computed(() => this.#parentControl.toggle());
}
