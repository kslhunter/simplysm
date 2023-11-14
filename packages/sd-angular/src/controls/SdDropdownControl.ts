import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  Injector,
  Input,
  NgZone,
  Output,
  ViewChild
} from "@angular/core";
import {coercionBoolean} from "../utils/commons";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div #contentEl
         [attr.tabindex]="disabled ? undefined : '0'"
         class="_sd-dropdown-control"
         [class]="contentClass"
         [style]="contentStyle"
         (click)="onContentClick()"
         (keydown)="onContentKeydown($event)">
      <ng-content/>
    </div>
    <ng-content select="sd-dropdown-popup"/>`
})
export class SdDropdownControl implements DoCheck {
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);
  #ngZone = inject(NgZone);
  #sdNgHelper = new SdNgHelper(inject(Injector));

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input({transform: coercionBoolean})
  open = false;

  @Output()
  openChange = new EventEmitter<boolean>();

  @Input()
  contentClass?: string;

  @Input()
  contentStyle?: string;

  @ViewChild("contentEl", {static: true})
  contentElRef!: ElementRef<HTMLElement>;

  @ContentChild(SdDropdownPopupControl, {static: true, read: ElementRef})
  popupElRef!: ElementRef<HTMLElement>;

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(run => {
      run({
        open: [this.open]
      }, () => {
        if (this.open) {
          document.body.appendChild(this.popupElRef.nativeElement);

          requestAnimationFrame(() => {
            const contentEl = this.contentElRef.nativeElement;
            const popupEl = this.popupElRef.nativeElement;

            const windowOffset = contentEl.getRelativeOffset(window.document.body);

            const isPlaceBottom = window.innerHeight < windowOffset.top * 2;
            const isPlaceRight = window.innerWidth < windowOffset.left * 2;

            Object.assign(
              popupEl.style,
              {
                top: isPlaceBottom ? "" : (windowOffset.top + contentEl.offsetHeight + 2) + "px",
                bottom: isPlaceBottom ? (window.innerHeight - windowOffset.top) + "px" : "",
                left: isPlaceRight ? "" : windowOffset.left + "px",
                right: isPlaceRight ? (window.innerWidth - windowOffset.left - contentEl.offsetWidth) + "px" : "",
                minWidth: contentEl.offsetWidth + "px",
                opacity: "1",
                pointerEvents: "auto",
                transform: "none"
              }
            );
          });
        }
        else {
          const contentEl = this.contentElRef.nativeElement;
          const popupEl = this.popupElRef.nativeElement;

          if (popupEl.matches(":focus, :has(*:focus)")) {
            contentEl.focus();
          }

          Object.assign(
            popupEl.style,
            {
              top: "",
              bottom: "",
              left: "",
              right: "",
              minWidth: "",
              opacity: "",
              pointerEvents: "",
              transform: "",
            }
          );
          popupEl.remove();
        }
      });
    });
  }

  #openPopup() {
    if (this.open) return;
    if (this.disabled) return;

    if (this.openChange.observed) {
      this.openChange.emit(true);
    }
    else {
      this.open = true;
    }
  }

  #closePopup() {
    if (!this.open) return;

    if (this.openChange.observed) {
      this.openChange.emit(false);
    }
    else {
      this.open = false;
    }
  }

  @HostListener("document:scroll.capture.outside", ["$event"])
  onDocumentScrollCaptureOutside(event: Event) {
    if (this.#elRef.nativeElement.findParent(event.target as Element)) {
      const contentEl = this.contentElRef.nativeElement;
      const popupEl = this.popupElRef.nativeElement;

      const windowOffset = contentEl.getRelativeOffset(window.document.body);

      if (window.innerHeight < windowOffset.top * 2) {
        Object.assign(
          popupEl.style,
          {
            top: "",
            bottom: (window.innerHeight - windowOffset.top) + "px",
            left: windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          popupEl.style,
          {
            top: (windowOffset.top + this.contentElRef!.nativeElement.offsetHeight) + "px",
            bottom: "",
            left: windowOffset.left + "px"
          }
        );
      }
    }
  }

  onContentClick() {
    if (this.open) {
      this.#closePopup();
    }
    else {
      this.#openPopup();
    }
  }

  onContentKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      if (!this.open) {
        event.preventDefault();
        event.stopPropagation();

        this.#openPopup();
      }
      else {
        const popupEl = this.popupElRef.nativeElement;
        const focusableFirst = popupEl.findFocusableFirst();
        if (focusableFirst) {
          event.preventDefault();
          event.stopPropagation();

          focusableFirst.focus();
        }
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === "ArrowUp") {
      if (this.open) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this.open) {
        this.#closePopup();
      }
      else {
        this.#openPopup();
      }
    }

    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }
  }

  onPopupKeydown(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.altKey && event.key === "Escape") {
      if (this.open) {
        event.preventDefault();
        event.stopPropagation();

        this.#closePopup();
      }
    }
  }

  #mouseoverEl?: HTMLElement;

  @HostListener("document:mouseover.outside", ["$event"])
  onDocumentMouseoverOutside(event: MouseEvent) {
    this.#mouseoverEl = event.target as HTMLElement;
  };

  @HostListener("document:blur.capture.outside", ["$event"])
  onBlurCaptureOutside(event: FocusEvent) {
    const contentEl = this.contentElRef!.nativeElement;
    const popupEl = this.popupElRef!.nativeElement;

    const relatedTarget = event.relatedTarget as HTMLElement | undefined;
    if (
      relatedTarget != null && (
        relatedTarget === contentEl
        || relatedTarget === popupEl
        || relatedTarget.findParent(contentEl)
        || relatedTarget.findParent(popupEl)
      )
    ) {
      return;
    }

    if (
      relatedTarget == null
      && this.#mouseoverEl instanceof HTMLElement
      && (this.#mouseoverEl.findParent(contentEl) || this.#mouseoverEl.findParent(popupEl))
    ) {
      const focusableFirst = popupEl.findFocusableFirst();
      if (focusableFirst) {
        popupEl.findFocusableFirst()?.focus();
      }
      else {
        contentEl.focus();
      }
    }

    if (this.open) {
      this.#ngZone.run(() => {
        this.#closePopup();
      });
    }
  };
}
