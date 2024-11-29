import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  HostListener,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";
import { $effect, $model } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { transformBoolean } from "../utils/transforms";

/**
 * 드롭다운 컴포넌트
 * 
 * 클릭하면 팝업 메뉴가 표시되는 드롭다운 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-dropdown>
 *   <button>메뉴 열기</button>
 *   <sd-dropdown-popup>
 *     <div>메뉴 항목 1</div>
 *     <div>메뉴 항목 2</div>
 *   </sd-dropdown-popup>
 * </sd-dropdown>
 * 
 * <!-- 양방향 바인딩 -->
 * <sd-dropdown [(open)]="isOpen">
 *   <button>메뉴 상태: {{isOpen}}</button>
 *   <sd-dropdown-popup>팝업 내용</sd-dropdown-popup>
 * </sd-dropdown>
 * 
 * <!-- 비활성화 -->
 * <sd-dropdown [disabled]="true">
 *   <button>비활성화된 드롭다운</button>
 *   <sd-dropdown-popup>팝업 내용</sd-dropdown-popup>
 * </sd-dropdown>
 * ```
 * 
 * @remarks
 * - 클릭하면 팝업 메뉴가 표시됩니다
 * - 키보드 탐색을 지원합니다
 * - 팝업의 위치가 자동으로 조정됩니다
 * - 양방향 바인딩을 지원합니다
 * - 비활성화 상태를 지원합니다
 * - 사용자 정의 스타일링이 가능합니다
 * - 팝업 외부 클릭 시 자동으로 닫힙니다
 * - 접근성을 고려한 키보드 인터랙션을 제공합니다
 */
@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      #contentEl
      class="_sd-dropdown-control"
      [attr.tabindex]="disabled() ? undefined : '0'"
      [class]="contentClass()"
      [style]="contentStyle()"
      (click)="onContentClick()"
      (keydown)="onContentKeydown($event)"
    >
      <ng-content />
    </div>
    <ng-content select="sd-dropdown-popup" />
  `,
  host: {
    "[attr.sd-disabled]": "disabled()",
  },
})
export class SdDropdownControl {
  /** HTML 엘리먼트 참조 */
  #elRef = injectElementRef<HTMLElement>();

  /** 드롭다운 열림 상태 (기본값: false) */
  _open = input(false, { alias: "open", transform: transformBoolean });
  /** 드롭다운 열림 상태 변경 이벤트 */
  _openChange = output<boolean>({ alias: "openChange" });
  /** 드롭다운 열림 상태 양방향 바인딩 */
  open = $model(this._open, this._openChange);

  /** 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });

  /** 콘텐츠 영역 CSS 클래스 */
  contentClass = input<string>();
  /** 콘텐츠 영역 인라인 스타일 */
  contentStyle = input<string>();

  /** 콘텐츠 엘리먼트 참조 */
  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", { read: ElementRef });
  /** 팝업 엘리먼트 참조 */
  popupElRef = contentChild.required<any, ElementRef<HTMLElement>>(SdDropdownPopupControl, { read: ElementRef });

  /**
   * 생성자
   * 
   * 드롭다운 팝업의 위치와 표시 상태를 관리합니다.
   * - 팝업이 열릴 때 body에 추가되고 적절한 위치에 배치됩니다
   * - 화면 공간에 따라 팝업 위치가 자동으로 조정됩니다
   * - 팝업이 닫힐 때 DOM에서 제거됩니다
   */
  constructor() {
    $effect(() => {
      if (this.open()) {
        document.body.appendChild(this.popupElRef().nativeElement);

        requestAnimationFrame(() => {
          const contentEl = this.contentElRef().nativeElement;
          const popupEl = this.popupElRef().nativeElement;

          const windowOffset = contentEl.getRelativeOffset(window.document.body);

          const isPlaceBottom = window.innerHeight < windowOffset.top * 2;
          const isPlaceRight = window.innerWidth < windowOffset.left * 2;

          Object.assign(popupEl.style, {
            top: isPlaceBottom ? "" : windowOffset.top + contentEl.offsetHeight + 2 + "px",
            bottom: isPlaceBottom ? window.innerHeight - windowOffset.top + "px" : "",
            left: isPlaceRight ? "" : windowOffset.left + "px",
            right: isPlaceRight ? window.innerWidth - windowOffset.left - contentEl.offsetWidth + "px" : "",
            minWidth: contentEl.offsetWidth + "px",
            opacity: "1",
            pointerEvents: "auto",
            transform: "none",
          });
        });
      }
      else {
        const contentEl = this.contentElRef().nativeElement;
        const popupEl = this.popupElRef().nativeElement;

        if (popupEl.matches(":focus, :has(*:focus)")) {
          contentEl.focus();
        }

        Object.assign(popupEl.style, {
          top: "",
          bottom: "",
          left: "",
          right: "",
          minWidth: "",
          opacity: "",
          pointerEvents: "",
          transform: "",
        });
        popupEl.remove();
      }
    });
  }

  /** 팝업 열기 */
  #openPopup() {
    if (this.open()) return;
    if (this.disabled()) return;

    this.open.set(true);
  }

  /** 팝업 닫기 */
  #closePopup() {
    if (!this.open()) return;

    this.open.set(false);
  }

  /** 문서 스크롤 이벤트 처리 - 팝업 위치 조정 */
  @HostListener("document:scroll.capture", ["$event"])
  onDocumentScrollCapture(event: Event) {
    if (this.#elRef.nativeElement.findParent(event.target as Element)) {
      const contentEl = this.contentElRef().nativeElement;
      const popupEl = this.popupElRef().nativeElement;

      const windowOffset = contentEl.getRelativeOffset(window.document.body);

      if (window.innerHeight < windowOffset.top * 2) {
        Object.assign(popupEl.style, {
          top: "",
          bottom: window.innerHeight - windowOffset.top + "px",
          left: windowOffset.left + "px",
        });
      }
      else {
        Object.assign(popupEl.style, {
          top: windowOffset.top + this.contentElRef().nativeElement.offsetHeight + "px",
          bottom: "",
          left: windowOffset.left + "px",
        });
      }
    }
  }

  /** 콘텐츠 클릭 이벤트 처리 - 팝업 토글 */
  onContentClick() {
    if (this.open()) {
      this.#closePopup();
    }
    else {
      this.#openPopup();
    }
  }

  /** 콘텐츠 키보드 이벤트 처리 - 접근성 키보드 인터랙션 */
  onContentKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      if (!this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#openPopup();
      }
      else {
        const popupEl = this.popupElRef().nativeElement;
        const focusableFirst = popupEl.findFocusableFirst();
        if (focusableFirst) {
          event.preventDefault();
          event.stopPropagation();

          focusableFirst.focus();
        }
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === "ArrowUp") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this.open()) {
        this.#closePopup();
      }
      else {
        this.#openPopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }
  }

  /** 팝업 키보드 이벤트 처리 - ESC 키로 닫기 */
  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }
  }

  /** 마우스 오버된 엘리먼트 추적 */
  #mouseoverEl?: HTMLElement;

  /** 문서 마우스오버 이벤트 처리 */
  @HostListener("document:mouseover", ["$event"])
  onDocumentMouseover(event: MouseEvent) {
    this.#mouseoverEl = event.target as HTMLElement;
  }

  /** 포커스 아웃 이벤트 처리 - 팝업 외부 클릭 시 닫기 */
  @HostListener("document:blur.capture", ["$event"])
  onBlurCapture(event: FocusEvent) {
    const contentEl = this.contentElRef().nativeElement;
    const popupEl = this.popupElRef().nativeElement;

    const relatedTarget = event.relatedTarget as HTMLElement | undefined;
    if (
      relatedTarget != null &&
      (relatedTarget === contentEl ||
        relatedTarget === popupEl ||
        relatedTarget.findParent(contentEl) ||
        relatedTarget.findParent(popupEl))
    ) {
      return;
    }

    if (
      relatedTarget == null &&
      this.#mouseoverEl instanceof HTMLElement &&
      (this.#mouseoverEl.findParent(contentEl) || this.#mouseoverEl.findParent(popupEl))
    ) {
      const focusableFirst = popupEl.findFocusableFirst();
      if (focusableFirst) {
        popupEl.findFocusableFirst()?.focus();
      }
      else {
        contentEl.focus();
      }
    }

    if (this.open()) {
      this.#closePopup();
    }
  }
}
