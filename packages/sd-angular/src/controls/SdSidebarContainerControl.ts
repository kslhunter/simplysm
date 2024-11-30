import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { $signal } from "../utils/$hooks";

/**
 * 사이드바 컨테이너 컴포넌트
 * 
 * 사이드바를 포함하는 컨테이너 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-sidebar-container>
 *   <sd-sidebar>
 *     <!-- 사이드바 내용 -->
 *   </sd-sidebar>
 *   <div>
 *     <!-- 메인 콘텐츠 -->
 *   </div>
 * </sd-sidebar-container>
 * ```
 * 
 * @remarks
 * - 반응형 레이아웃을 지원합니다
 * - 사이드바 토글 기능을 제공합니다
 * - 모바일 환경에서 백드롭을 표시합니다
 * - 라우터 변경 시 자동으로 사이드바가 닫힙니다
 * - 애니메이션 효과를 제공합니다
 */
@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-sidebar-container {
        display: block;
        position: relative;
        height: 100%;
        padding-left: var(--sidebar-width);
        transition: padding-left 0.1s ease-out;

        &[sd-toggle="true"] {
          padding-left: 0;
          transition: padding-left 0.1s ease-in;
        }

        > ._backdrop {
          display: none;
        }
      }

      @media all and (max-width: 520px) {
        sd-sidebar-container {
          padding-left: 0;

          > ._backdrop {
            position: absolute;
            display: block;
            z-index: calc(var(--z-index-sidebar) - 1);
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease-in-out;
          }

          &[sd-toggle="true"] {
            > ._backdrop {
              opacity: 0.6;
              pointer-events: auto;
            }
          }
        }
      }
    `
  ],
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>`,
  host: {
    "[attr.sd-toggle]": "toggle()"
  }
})
export class SdSidebarContainerControl {
  /** 라우터 인스턴스를 주입받는 private 필드 */
  #router: Router | null = inject(Router, { optional: true });

  /** 사이드바의 토글 상태를 관리하는 시그널 */
  toggle = $signal(false);

  /**
   * 컴포넌트 생성자
   * 라우터가 존재할 경우, 네비게이션 시작 시 사이드바를 닫음
   */
  constructor() {
    if (this.#router) {
      this.#router.events.subscribe((value) => {
        if (value instanceof NavigationStart) {
          this.toggle.set(false);
        }
      });
    }
  }

  /** 백드롭 클릭 시 사이드바 토글 상태를 반전시키는 핸들러 */
  onBackdropClick() {
    this.toggle.update((v) => !v);
  }
}
