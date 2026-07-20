import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownPopup } from "./sd-dropdown-popup";
import "@simplysm/core-browser";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.tabindex]": "disabled() ? undefined : '0'",
    "(click)": "onHostClick()",
    "(keydown)": "onHostKeydown($event)",
  },
  template: `
    <ng-content />
    <ng-content select="sd-dropdown-popup" />
  `,
})
export class SdDropdown {
  private readonly _elRef = inject(ElementRef<HTMLElement>);

  open = model(false);
  disabled = input(false, { transform: booleanAttribute });

  popupElRef = contentChild.required<SdDropdownPopup, ElementRef<HTMLElement>>(SdDropdownPopup, {
    read: ElementRef,
  });

  private _popupEl?: HTMLElement;
  /** `<svg>` 등 비-HTML 요소도 hover 대상이 되므로 `Element` 로 받는다. */
  private _mouseoverEl?: Element;
  private _backdropEl?: HTMLElement;
  private readonly _isMobile;
  private readonly _mql: MediaQueryList;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // $breakpoint-mobile (SCSS 변수 참조 불가, 값 동기화 필요)
    this._mql = window.matchMedia("(max-width: 520px)");
    this._isMobile = signal(this._mql.matches);

    const onMqlChange = (e: MediaQueryListEvent) => {
      this._isMobile.set(e.matches);
    };
    this._mql.addEventListener("change", onMqlChange);
    destroyRef.onDestroy(() => {
      this._mql.removeEventListener("change", onMqlChange);
    });

    effect((onCleanup) => {
      if (this.open()) {
        const popupEl = this.popupElRef().nativeElement;
        this._popupEl = popupEl;
        document.body.appendChild(popupEl);

        if (this._isMobile()) {
          popupEl.setAttribute("data-sd-mobile", "");

          const backdrop = document.createElement("div");
          backdrop.setAttribute("data-sd-dropdown-backdrop", "");
          backdrop.style.cssText =
            "position:fixed;inset:0;background-color:var(--sd-bg-busy-overlay);z-index:var(--sd-z-dropdown)";
          backdrop.addEventListener("click", () => {
            this._closePopup();
          });
          document.body.insertBefore(backdrop, popupEl);
          this._backdropEl = backdrop;
        } else {
          this._updatePopupPosition();
        }

        const onScroll = (event: Event) => {
          this._onDocumentScrollCapture(event);
        };
        const onMouseover = (event: Event) => {
          const target = (event as MouseEvent).target;
          this._mouseoverEl = target instanceof Element ? target : undefined;
        };
        const onBlur = (event: Event) => {
          this._onDocumentBlurCapture(event as FocusEvent);
        };

        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        document.addEventListener("mouseover", onMouseover);
        document.addEventListener("blur", onBlur, { capture: true });

        onCleanup(() => {
          document.removeEventListener("scroll", onScroll, { capture: true });
          document.removeEventListener("mouseover", onMouseover);
          document.removeEventListener("blur", onBlur, { capture: true });
          this._removePopup();
        });
      } else {
        this._removePopup();
      }
    });
  }

  onHostClick(): void {
    if (this.open()) {
      this._closePopup();
    } else {
      this._openPopup();
    }
  }

  onHostKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey) return;

    if (event.key === "ArrowDown") {
      if (!this.open()) {
        event.preventDefault();
        event.stopPropagation();
        this._openPopup();
      } else {
        const popupEl = this.popupElRef().nativeElement;
        const tabbable = popupEl.findFirstTabbableChild();
        if (tabbable) {
          event.preventDefault();
          event.stopPropagation();
          tabbable.focus();
        }
      }
    }

    if (event.key === "ArrowUp") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();
        this._closePopup();
      }
    }

    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (this.open()) {
        this._closePopup();
      } else {
        this._openPopup();
      }
    }

    if (event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();
        this._closePopup();
      }
    }
  }

  onPopupKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey) return;

    if (event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();
        this._closePopup();
      }
    }
  }

  private _openPopup(): void {
    if (this.open()) return;
    if (this.disabled()) return;

    this.open.set(true);
  }

  private _closePopup(): void {
    if (!this.open()) return;

    this.open.set(false);
  }

  private _updatePopupPosition(): void {
    const contentEl = this._elRef.nativeElement;
    const popupEl = this._popupEl;
    if (popupEl == null) return;

    contentEl.repaint();

    const rect = contentEl.getBoundingClientRect();

    const shouldPlaceAbove = window.innerHeight < rect.top * 2;
    const shouldPlaceLeft = window.innerWidth < rect.left * 2;

    const gap = 2;
    const topPos = shouldPlaceAbove ? undefined : rect.bottom + gap;
    const bottomPos = shouldPlaceAbove ? window.innerHeight - rect.top : undefined;
    const leftPos = shouldPlaceLeft ? undefined : rect.left;
    const rightPos = shouldPlaceLeft ? window.innerWidth - rect.right : undefined;

    Object.assign(popupEl.style, {
      top: topPos != null ? topPos + "px" : "",
      bottom: bottomPos != null ? bottomPos + "px" : "",
      left: leftPos != null ? leftPos + "px" : "",
      right: rightPos != null ? rightPos + "px" : "",
      minWidth: contentEl.offsetWidth + "px",
      opacity: "1",
      pointerEvents: "auto",
      transform: "none",
    });
  }

  private _onDocumentScrollCapture(event: Event): void {
    if (this._isMobile()) return;

    const contentEl = this._elRef.nativeElement;
    if ((event.target as Element).contains(contentEl)) {
      this._updatePopupPosition();
    }
  }

  private _onDocumentBlurCapture(event: FocusEvent): void {
    const contentEl = this._elRef.nativeElement;
    const popupEl = this._popupEl;
    if (popupEl == null) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof HTMLElement) {
      if (
        relatedTarget === contentEl ||
        relatedTarget === popupEl ||
        contentEl.contains(relatedTarget) === true ||
        popupEl.contains(relatedTarget) === true
      ) {
        return;
      }
    }

    // 팝업 내부 요소가 disabled 로 전환되며 포커스를 잃은 경우.
    // 브라우저가 렌더 도중 동기 blur 를 발사하는 경로이며, 사용자가 팝업을 벗어난 것이 아니다.
    // 여기서 팝업을 닫으면 렌더 중 signal 쓰기가 되어 NG0600 이 발생한다.
    const blurredEl = event.target;
    if (
      relatedTarget == null &&
      blurredEl instanceof HTMLElement &&
      (contentEl.contains(blurredEl) === true || popupEl.contains(blurredEl) === true) &&
      blurredEl.matches(":disabled")
    ) {
      this._restoreFocus();
      return;
    }

    const mouseoverEl = this._mouseoverEl;
    if (
      relatedTarget == null &&
      mouseoverEl instanceof Element &&
      (contentEl.contains(mouseoverEl) === true || popupEl.contains(mouseoverEl) === true)
    ) {
      this._restoreFocus();
      return;
    }

    if (this.open()) {
      this._closePopup();
    }
  }

  /** 팝업이 열린 상태를 유지해야 할 때 포커스를 팝업 안으로 되돌린다. */
  private _restoreFocus(): void {
    const popupEl = this._popupEl;
    if (popupEl == null) return;

    const tabbable = popupEl.findFirstTabbableChild();
    if (tabbable != null) {
      tabbable.focus();
    } else {
      this._elRef.nativeElement.focus();
    }
  }

  private _removePopup(): void {
    if (this._backdropEl != null) {
      this._backdropEl.remove();
      this._backdropEl = undefined;
    }

    const popupEl = this._popupEl;
    if (popupEl != null) {
      const contentEl = this._elRef.nativeElement;

      if (popupEl.matches(":focus-within")) {
        contentEl.focus();
      }

      popupEl.removeAttribute("data-sd-mobile");
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
      this._popupEl = undefined;
    }
  }
}
