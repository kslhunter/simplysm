import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { $effect } from "../../../core/utils/bindings/$effect";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";

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
    "(document:scroll.capture.passive)": "onDocumentScrollCapture($event)",
    "(document:mouseover)": "onDocumentMouseover($event)",
    "(document:blur.capture)": "onDocumentBlurCapture($event)",
  },
  template: `
    <ng-content />
    <ng-content select="sd-dropdown-popup" />
  `,
})
export class SdDropdownControl {
  elRef = injectElementRef<HTMLElement>();

  open = model(false);

  disabled = input(false, { transform: transformBoolean });

  contentClass = input<string>();
  contentStyle = input<string>();

  popupElRef = contentChild.required<any, ElementRef<HTMLElement>>(SdDropdownPopupControl, {
    read: ElementRef,
  });

  constructor() {
    $effect(() => {
      if (this.open()) {
        document.body.appendChild(this.popupElRef().nativeElement);

        requestAnimationFrame(() => {
          const contentEl = this.elRef.nativeElement;
          const popupEl = this.popupElRef().nativeElement;

          const windowOffset = contentEl.getRelativeOffset(window.document.body);

          const isPlaceBottom = window.innerHeight < windowOffset.top * 2;
          const isPlaceRight = window.innerWidth < windowOffset.left * 2;

          Object.assign(popupEl.style, {
            top: isPlaceBottom ? "" : windowOffset.top + contentEl.offsetHeight + 2 + "px",
            bottom: isPlaceBottom ? window.innerHeight - windowOffset.top + "px" : "",
            left: isPlaceRight ? "" : windowOffset.left + "px",
            right: isPlaceRight
              ? window.innerWidth - windowOffset.left - contentEl.offsetWidth + "px"
              : "",
            minWidth: contentEl.offsetWidth + "px",
            opacity: "1",
            pointerEvents: "auto",
            transform: "none",
          });
        });
      } else {
        const contentEl = this.elRef.nativeElement;
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

  private _openPopup() {
    if (this.open()) return;
    if (this.disabled()) return;

    this.open.set(true);
  }

  private _closePopup() {
    if (!this.open()) return;

    this.open.set(false);
  }

  onDocumentScrollCapture(event: Event) {
    if (this.elRef.nativeElement.findParent(event.target as Element)) {
      const contentEl = this.elRef.nativeElement;
      const popupEl = this.popupElRef().nativeElement;

      const windowOffset = contentEl.getRelativeOffset(window.document.body);

      if (window.innerHeight < windowOffset.top * 2) {
        Object.assign(popupEl.style, {
          top: "",
          bottom: window.innerHeight - windowOffset.top + "px",
          left: windowOffset.left + "px",
        });
      } else {
        Object.assign(popupEl.style, {
          top: windowOffset.top + this.elRef.nativeElement.offsetHeight + "px",
          bottom: "",
          left: windowOffset.left + "px",
        });
      }
    }
  }

  onHostClick() {
    if (this.open()) {
      this._closePopup();
    } else {
      this._openPopup();
    }
  }

  onHostKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      if (!this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this._openPopup();
      } else {
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

        this._closePopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this.open()) {
        this._closePopup();
      } else {
        this._openPopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this._closePopup();
      }
    }
  }

  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this._closePopup();
      }
    }
  }

  private _mouseoverEl?: HTMLElement;

  onDocumentMouseover(event: MouseEvent) {
    this._mouseoverEl = event.target as HTMLElement;
  }

  onDocumentBlurCapture(event: FocusEvent) {
    const contentEl = this.elRef.nativeElement;
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
      this._mouseoverEl instanceof HTMLElement &&
      (this._mouseoverEl.findParent(contentEl) || this._mouseoverEl.findParent(popupEl))
    ) {
      const focusableFirst = popupEl.findFocusableFirst();
      if (focusableFirst) {
        popupEl.findFocusableFirst()?.focus();
      } else {
        contentEl.focus();
      }
    }

    if (this.open()) {
      this._closePopup();
    }
  }
}
