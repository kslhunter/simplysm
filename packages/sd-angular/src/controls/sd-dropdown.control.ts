import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  HostListener,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { $effect } from "../utils/bindings/$effect";
import { injectElementRef } from "../utils/injections/inject-element-ref";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";

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
  #elRef = injectElementRef<HTMLElement>();

  open = model(false);

  disabled = input(false, { transform: transformBoolean });

  contentClass = input<string>();
  contentStyle = input<string>();

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", {
    read: ElementRef,
  });
  popupElRef = contentChild.required<any, ElementRef<HTMLElement>>(SdDropdownPopupControl, {
    read: ElementRef,
  });

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

  #openPopup() {
    if (this.open()) return;
    if (this.disabled()) return;

    this.open.set(true);
  }

  #closePopup() {
    if (!this.open()) return;

    this.open.set(false);
  }

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
      } else {
        Object.assign(popupEl.style, {
          top: windowOffset.top + this.contentElRef().nativeElement.offsetHeight + "px",
          bottom: "",
          left: windowOffset.left + "px",
        });
      }
    }
  }

  onContentClick() {
    if (this.open()) {
      this.#closePopup();
    } else {
      this.#openPopup();
    }
  }

  onContentKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      if (!this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#openPopup();
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

        this.#closePopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this.open()) {
        this.#closePopup();
      } else {
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

  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }
  }

  #mouseoverEl?: HTMLElement;

  @HostListener("document:mouseover", ["$event"])
  onDocumentMouseover(event: MouseEvent) {
    this.#mouseoverEl = event.target as HTMLElement;
  }

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
      } else {
        contentEl.focus();
      }
    }

    if (this.open()) {
      this.#closePopup();
    }
  }
}
