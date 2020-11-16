import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NeverEntryError } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.tabindex]="disabled ? undefined : '0'"
         class="_sd-dropdown-control"
         [attr.class]="'_sd-dropdown-control ' + contentClass">
      <ng-content></ng-content>
    </div>
    <ng-content select="sd-dropdown-popup"></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      > div {
        position: relative;
      }
    }
  `]
})
export class SdDropdownControl implements OnInit, OnDestroy {
  @Input()
  @HostBinding("attr.sd-disabled")
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  /** @deprecated */
  @Input()
  @SdInputValidate(Boolean)
  public useAllBorderRadius?: boolean;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  @Input("content.class")
  @SdInputValidate(String)
  public contentClass?: string;

  private _isOpen = false;

  private readonly _el: HTMLElement;
  private _controlEl?: HTMLElement;
  private _dropdownEl?: HTMLElement;

  private _mouseoverEl?: HTMLElement;

  public mouseoverEventHandler = (event: MouseEvent): void => {
    this._mouseoverEl = event.target as HTMLElement;
  };

  public constructor(private readonly _elRef: ElementRef) {
    this._el = (this._elRef.nativeElement as HTMLElement);
  }

  public ngOnInit(): void {
    this._controlEl = this._el.findAll("> ._sd-dropdown-control")[0];
    this._dropdownEl = this._el.findAll("> sd-dropdown-popup")[0];

    // this._controlEl.addEventListener("focus", this.focusEventHandler, true);
    this._controlEl.addEventListener("blur", this.blurEventHandler, true);
    this._controlEl.addEventListener("click", this.clickEventHandler, true);
    this._controlEl.addEventListener("keydown", this.keydownEventHandler, true);
    document.addEventListener("mouseover", this.mouseoverEventHandler, true);

    this._dropdownEl.remove();
  }

  public ngOnDestroy(): void {
    if (this._dropdownEl) {
      this._dropdownEl.remove();
      document.removeEventListener("scroll", this.scrollEventHandler, true);
      document.removeEventListener("mouseover", this.mouseoverEventHandler);
    }
  }

  public openPopup(): void {
    if (this._isOpen) return;
    if (this.disabled) return;
    this._isOpen = true;

    if (!this._dropdownEl) throw new NeverEntryError();
    if (!this._controlEl) throw new NeverEntryError();

    document.body.appendChild(this._dropdownEl);
    this._dropdownEl.addEventListener("blur", this.blurEventHandler, true);

    const windowOffset = this._controlEl.getRelativeOffset(window.document.body);

    const placeBottom = window.innerHeight < windowOffset.top * 2;
    const placeRight = window.innerWidth < windowOffset.left * 2;

    const top = placeBottom ? "" : (windowOffset.top + this._controlEl.offsetHeight + 2) + "px";
    const bottom = placeBottom ? (window.innerHeight - windowOffset.top) + "px" : "";
    const left = placeRight ? "" : windowOffset.left + "px";
    const right = placeRight ? (window.innerWidth - windowOffset.left - this._controlEl.offsetWidth) + "px" : "";
    const minWidth = this._controlEl.offsetWidth + "px";
    const opacity = "1";
    const pointerEvents = "auto";
    const transform = "none";
    /*const borderTopRightRadius = this.useAllBorderRadius ? "4px" : placeBottom ? "4px" : "";
    const borderTopLeftRadius = this.useAllBorderRadius ? "4px" : placeBottom ? "4px" : "";
    const borderBottomRightRadius = this.useAllBorderRadius ? "4px" : placeBottom ? "" : "4px";
    const borderBottomLeftRadius = this.useAllBorderRadius ? "4px" : placeBottom ? "" : "4px";
    const paddingTop = this.useAllBorderRadius ? "4px" : placeBottom ? "4px" : "";
    const paddingBottom = this.useAllBorderRadius ? "4px" : placeBottom ? "" : "4px";*/

    Object.assign(
      this._dropdownEl.style,
      {
        top,
        bottom,
        left,
        right,
        minWidth,
        opacity,
        pointerEvents,
        transform/*,
        borderTopRightRadius,
        borderTopLeftRadius,
        borderBottomRightRadius,
        borderBottomLeftRadius,
        paddingTop,
        paddingBottom*/
      }
    );


    /*if (window.innerHeight < this._controlEl.windowOffset.top * 2) {
      Object.assign(
        this._dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - this._controlEl.windowOffset.top) + "px",
          left: this._controlEl.windowOffset.left + 1 + "px",
          minWidth: this._controlEl.clientWidth + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none"
          // borderTopRightRadius: "4px",
          // borderTopLeftRadius: "4px"
        }
      );
    }
    else {
      Object.assign(
        this._dropdownEl.style,
        {
          top: (this._controlEl.windowOffset.top + this._controlEl.offsetHeight) + "px",
          bottom: "",
          left: this._controlEl.windowOffset.left + 1 + "px",
          minWidth: this._controlEl.clientWidth + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none"
          // borderBottomRightRadius: "4px",
          // borderBottomLeftRadius: "4px"
        }
      );
    }*/

    document.addEventListener("scroll", this.scrollEventHandler, true);

    this.open.emit();
  }

  public closePopup(): void {
    if (!this._isOpen) return;
    this._isOpen = false;

    if (!this._dropdownEl) throw new NeverEntryError();

    Object.assign(
      this._dropdownEl.style,
      {
        opacity: "0",
        pointerEvents: "none",
        transform: "translateY(-10px)"
      }
    );

    document.removeEventListener("scroll", this.scrollEventHandler, true);

    this.close.emit();
  }

  public scrollEventHandler = (event: Event): void => {
    if (!this._dropdownEl) throw new NeverEntryError();
    if (!this._controlEl) throw new NeverEntryError();

    if (this._el.findParent(event.target as HTMLElement)) {
      const windowOffset = this._controlEl.getRelativeOffset(window.document.body);

      if (window.innerHeight < windowOffset.top * 2) {
        Object.assign(
          this._dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - windowOffset.top) + "px",
            left: windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          this._dropdownEl.style,
          {
            top: (windowOffset.top + this._controlEl.offsetHeight) + "px",
            bottom: "",
            left: windowOffset.left + "px"
          }
        );
      }
    }
  };

  public clickEventHandler = (): void => {
    if (this._isOpen) {
      this.closePopup();
    }
    else {
      this.openPopup();
    }
  };

  public keydownEventHandler = (event: KeyboardEvent): void => {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();

      this.openPopup();
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (this._isOpen) {
        this.closePopup();
      }
      else {
        this.openPopup();
      }
    }
  };

  public blurEventHandler = (event: FocusEvent): void => {
    if (!this._dropdownEl) throw new NeverEntryError();
    if (!this._controlEl) throw new NeverEntryError();

    const relatedTarget = event.relatedTarget as HTMLElement | undefined;
    if (
      relatedTarget != null && (
        relatedTarget === this._controlEl ||
        relatedTarget === this._dropdownEl ||
        relatedTarget.findParent(this._controlEl) ||
        relatedTarget.findParent(this._dropdownEl)
      )
    ) {
      return;
    }

    if (
      relatedTarget == null &&
      this._mouseoverEl instanceof HTMLElement &&
      (this._mouseoverEl.findParent(this._controlEl) || this._mouseoverEl.findParent(this._dropdownEl))
    ) {
      const firstFocusableEl = this._controlEl.isFocusable() ? this._controlEl : this._controlEl.findFocusableAll()[0];
      if (typeof firstFocusableEl !== "undefined") {
        firstFocusableEl.focus();
        return;
      }
      else {
        const firstFocusableEl1 = this._dropdownEl.isFocusable() ? this._dropdownEl : this._dropdownEl.findFocusableAll()[0];
        if (typeof firstFocusableEl1 !== "undefined") {
          firstFocusableEl1.focus();
          return;
        }
      }
    }

    this.closePopup();
  };
}
