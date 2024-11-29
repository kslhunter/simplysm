import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "../controls/SdBusyContainerControl";
import { SdPaneControl } from "../controls/SdPaneControl";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { SdAppStructureProvider } from "../providers/SdAppStructureProvider";
import { SdTopbarContainerControl } from "../controls/SdTopbarContainerControl";
import { SdTopbarControl } from "../controls/SdTopbarControl";
import { NgTemplateOutlet } from "@angular/common";
import { injectPageCode$ } from "../utils/injectPageCode$";
import { $computed, $effect } from "../utils/$hooks";
import { ActivatedRoute } from "@angular/router";
import { injectParent } from "../utils/injectParent";
import { SdActivatedModalProvider } from "../providers/SdModalProvider";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "../controls/SdIconControl";
import { SdBackgroundProvider } from "../providers/SdBackgroundProvider";

/**
 * 기본 컨테이너 컴포넌트
 * 
 * 페이지나 모달의 기본 레이아웃을 제공하는 컨테이너 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 페이지 컨테이너로 사용 -->
 * <sd-base-container [title]="'페이지 제목'">
 *   <ng-template #content>
 *     페이지 내용
 *   </ng-template>
 * </sd-base-container>
 * 
 * <!-- 모달 컨테이너로 사용 -->
 * <sd-base-container containerType="modal">
 *   <ng-template #content>
 *     모달 내용
 *   </ng-template>
 * </sd-base-container>
 * ```
 * 
 * @remarks
 * - 페이지와 모달에서 공통으로 사용되는 기본 레이아웃을 제공합니다
 * - 로딩 상태 표시를 지원합니다
 * - 권한 체크 및 접근 제어를 지원합니다
 * - 상단바(topbar)를 포함한 레이아웃을 제공합니다
 * - 애니메이션 효과를 지원합니다
 * - 페이지 타이틀을 표시합니다
 * - 사용자 정의 템플릿을 지원합니다
 */
@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdPaneControl,
    SdTopbarContainerControl,
    SdTopbarControl,
    NgTemplateOutlet,
    SdIconControl,
  ],
  template: `
    @if (denied()) {
      <sd-pane
        class="tx-theme-grey-light p-xxl tx-center"
        [class.show-effect]="!noEffect() && containerType !== 'modal'"
      >
        <br />
        <sd-icon [icon]="faTriangleExclamation" fixedWidth size="5x" />
        <br />
        <br />
        {{ title() }}에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
      </sd-pane>
    } @else if (containerType === "page" && isLastPage() && title() != "undefined") {
      <sd-topbar-container>
        <sd-topbar>
          <h4>{{ title() }}</h4>

          @if (initialized()) {
            <ng-template [ngTemplateOutlet]="topbarTemplateRef() ?? null" />
          }
        </sd-topbar>

        <sd-busy-container [busy]="busy()">
          @if (initialized()) {
            <sd-pane [class.show-effect]="!noEffect()">
              <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
            </sd-pane>
          }
        </sd-busy-container>
      </sd-topbar-container>
    } @else {
      <sd-busy-container [busy]="busy()">
        @if (initialized()) {
          <sd-pane [class.show-effect]="!noEffect() && containerType !== 'modal'">
            <ng-template [ngTemplateOutlet]="contentTemplateRef() ?? null" />
          </sd-pane>
        }
      </sd-busy-container>
    }
  `,
})
export class SdBaseContainerControl {
  /** 현재 활성화된 라우트 */
  #activatedRoute = inject(ActivatedRoute);
  /** 활성화된 모달 프로바이더 */
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  /** 앱 구조 프로바이더 */
  #sdAppStructure = inject(SdAppStructureProvider);
  /** 배경 프로바이더 */
  #sdBackground = inject(SdBackgroundProvider);

  /** 부모 컴포넌트 */
  #parent = injectParent();

  /** 컨테이너 타입 (page, modal, control) */
  containerType =
    this.#activatedRoute.component === this.#parent.constructor
      ? "page"
      : this.#sdActivatedModal
        ? "modal"
        : "control";

  /** 현재 페이지가 마지막 페이지인지 여부 */
  isLastPage = $computed(() =>
    this.#activatedRoute.pathFromRoot.slice(2).map(item => item.snapshot.url).join(".") === this.pageCode(),
  );

  /** 페이지 코드 */
  pageCode = injectPageCode$();
  /** 컨테이너 제목 */
  title = $computed(() =>
    this.#sdActivatedModal
      ? this.#sdActivatedModal.modal.title()
      : this.#sdAppStructure.getTitleByCode(this.pageCode()),
  );

  /** 로딩 상태 여부 */
  busy = input(false, { transform: transformBoolean });
  /** 초기화 완료 여부 */
  initialized = input(true, { transform: transformBoolean });
  /** 접근 거부 여부 */
  denied = input(false, { transform: transformBoolean });
  /** 효과 비활성화 여부 */
  noEffect = input(false, { transform: transformBoolean });
  /** 회색 배경 사용 여부 */
  bgGrey = input(false, { transform: transformBoolean });

  /** 상단바 템플릿 참조 */
  topbarTemplateRef = contentChild("topbarTemplate", { read: TemplateRef });
  /** 컨텐츠 템플릿 참조 */
  contentTemplateRef = contentChild("contentTemplate", { read: TemplateRef });

  constructor() {
    $effect([this.initialized], () => {
      if (this.containerType === "modal") {
        if (this.initialized()) {
          this.#sdActivatedModal!.content.open();
        }
      }
    });

    $effect([this.bgGrey], () => {
      this.#sdBackground.theme.set(this.bgGrey() ? "grey" : undefined);
    });
  }

  /** 경고 아이콘 */
  protected readonly faTriangleExclamation = faTriangleExclamation;
}
