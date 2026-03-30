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
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";
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
export class SdDropdownControl {
  private readonly _elRef = inject(ElementRef<HTMLElement>);

  open = model(false);
  disabled = input(false, { transform: booleanAttribute });

  popupElRef = contentChild.required<SdDropdownPopupControl, ElementRef<HTMLElement>>(
    SdDropdownPopupControl,
    { read: ElementRef },
  );

  private _popupEl?: HTMLElement;
  private _mouseoverEl?: HTMLElement;
  private _backdropEl?: HTMLElement;
  private _isMobile: boolean;
  private readonly _mql: MediaQueryList;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // $breakpoint-mobile (SCSS 변수 참조 불가, 값 동기화 필요)
    this._mql = window.matchMedia("(max-width: 520px)");
    this._isMobile = this._mql.matches;

    const onMqlChange = (e: MediaQueryListEvent) => {
      this._isMobile = e.matches;
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

        if (this._isMobile) {
          popupEl.setAttribute("data-sd-mobile", "");

          const backdrop = document.createElement("div");
          backdrop.setAttribute("data-sd-dropdown-backdrop", "");
          backdrop.style.cssText =
            "position:fixed;inset:0;background:var(--busy-overlay-bg);z-index:var(--z-index-dropdown)";
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
          this._mouseoverEl = (event as MouseEvent).target as HTMLElement;
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
        const focusable = popupEl.findFirstFocusableChild();
        if (focusable) {
          event.preventDefault();
          event.stopPropagation();
          focusable.focus();
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

    const windowOffset = contentEl.getRelativeOffset(document.body);

    const isPlaceBottom = window.innerHeight < windowOffset.top * 2;
    const isPlaceRight = window.innerWidth < windowOffset.left * 2;

    const gap = 2;
    const topPos = isPlaceBottom ? undefined : windowOffset.top + contentEl.offsetHeight + gap;
    const bottomPos = isPlaceBottom ? window.innerHeight - windowOffset.top : undefined;
    const leftPos = isPlaceRight ? undefined : windowOffset.left;
    const rightPos = isPlaceRight
      ? window.innerWidth - windowOffset.left - contentEl.offsetWidth
      : undefined;

    // Calculate available space for popup
    const availableHeight = isPlaceBottom
      ? windowOffset.top - gap
      : window.innerHeight - (windowOffset.top + contentEl.offsetHeight + gap);
    const availableWidth = isPlaceRight
      ? windowOffset.left + contentEl.offsetWidth
      : window.innerWidth - windowOffset.left;

    Object.assign(popupEl.style, {
      top: topPos !== undefined ? topPos + "px" : "",
      bottom: bottomPos !== undefined ? bottomPos + "px" : "",
      left: leftPos !== undefined ? leftPos + "px" : "",
      right: rightPos !== undefined ? rightPos + "px" : "",
      minWidth: contentEl.offsetWidth + "px",
      maxHeight: availableHeight > 0 ? availableHeight + "px" : "",
      maxWidth: availableWidth > 0 ? availableWidth + "px" : "",
      overflow: "auto",
      opacity: "1",
      pointerEvents: "auto",
      transform: "none",
    });
  }

  private _onDocumentScrollCapture(event: Event): void {
    if (this._isMobile) return;

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

    const mouseoverEl = this._mouseoverEl;
    if (
      relatedTarget == null &&
      mouseoverEl instanceof HTMLElement &&
      (contentEl.contains(mouseoverEl) === true || popupEl.contains(mouseoverEl) === true)
    ) {
      const focusable = popupEl.findFirstFocusableChild();
      if (focusable != null) {
        focusable.focus();
      } else {
        contentEl.focus();
      }
      return;
    }

    if (this.open()) {
      this._closePopup();
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
