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
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";
import { $effect } from "../utils/hooks/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { transformBoolean } from "../utils/type-tramsforms";
import { $model } from "../utils/hooks/$model";

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
  private _elRef = injectElementRef<HTMLElement>();

  __open = input(false, { alias: "open", transform: transformBoolean });
  __openChange = output<boolean>({ alias: "openChange" });
  open = $model(this.__open, this.__openChange);

  disabled = input(false, { transform: transformBoolean });

  contentClass = input<string>();
  contentStyle = input<string>();

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>(
    "contentEl",
    { read: ElementRef },
  );
  popupElRef = contentChild.required<any, ElementRef<HTMLElement>>(
    SdDropdownPopupControl,
    { read: ElementRef },
  );

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
            right: isPlaceRight ? window.innerWidth
              - windowOffset.left
              - contentEl.offsetWidth
              + "px" : "",
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

  private _openPopup() {
    if (this.open()) return;
    if (this.disabled()) return;

    this.open.set(true);
  }

  private _closePopup() {
    if (!this.open()) return;

    this.open.set(false);
  }

  @HostListener("document:scroll.capture", ["$event"])
  onDocumentScrollCapture(event: Event) {
    if (this._elRef.nativeElement.findParent(event.target as Element)) {
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

  onContentClick() {
    if (this.open()) {
      this._closePopup();
    }
    else {
      this._openPopup();
    }
  }

  onContentKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      if (!this.open()) {
        event.preventDefault();
        event.stopPropagation();

        this._openPopup();
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

        this._closePopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this.open()) {
        this._closePopup();
      }
      else {
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

  @HostListener("document:mouseover", ["$event"])
  onDocumentMouseover(event: MouseEvent) {
    this._mouseoverEl = event.target as HTMLElement;
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
      this._mouseoverEl instanceof HTMLElement &&
      (this._mouseoverEl.findParent(contentEl) || this._mouseoverEl.findParent(popupEl))
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
      this._closePopup();
    }
  }
}
