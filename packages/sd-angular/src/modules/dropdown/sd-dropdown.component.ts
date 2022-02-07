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
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdInputValidate } from "../../decorators/SdInputValidate";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.tabindex]="disabled ? undefined : '0'"
         class="_sd-dropdown-control"
         [ngClass]="contentClass">
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
export class SdDropdownComponent implements OnInit, OnDestroy {
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

  private readonly el: HTMLElement;
  public controlEl?: HTMLElement;
  public dropdownEl?: HTMLElement;

  private _mouseoverEl?: HTMLElement;

  public mouseoverEventHandler = (event: MouseEvent): void => {
    this._mouseoverEl = event.target as HTMLElement;
  };

  public constructor(private readonly _elRef: ElementRef) {
    this.el = (this._elRef.nativeElement as HTMLElement);
  }

  public ngOnInit(): void {
    this.controlEl = this.el.findAll("> ._sd-dropdown-control")[0];
    this.dropdownEl = this.el.findAll("> sd-dropdown-popup")[0];

    // this.controlEl.addEventListener("focus", this.focusEventHandler, true);
    this.controlEl.addEventListener("blur", this.blurEventHandler, true);
    this.controlEl.addEventListener("click", this.clickEventHandler, true);
    this.controlEl.addEventListener("keydown", this.keydownEventHandler, true);
    document.addEventListener("mouseover", this.mouseoverEventHandler, true);

    this.dropdownEl.remove();
  }

  public ngOnDestroy(): void {
    if (this.dropdownEl) {
      this.dropdownEl.remove();
      document.removeEventListener("scroll", this.scrollEventHandler, true);
      document.removeEventListener("mouseover", this.mouseoverEventHandler);
    }
  }

  public openPopup(): void {
    if (this._isOpen) return;
    if (this.disabled) return;
    this._isOpen = true;

    if (!this.dropdownEl) throw new NeverEntryError();
    if (!this.controlEl) throw new NeverEntryError();

    document.body.appendChild(this.dropdownEl);
    this.dropdownEl.addEventListener("blur", this.blurEventHandler, true);

    const windowOffset = this.controlEl.getRelativeOffset(window.document.body);

    const placeBottom = window.innerHeight < windowOffset.top * 2;
    const placeRight = window.innerWidth < windowOffset.left * 2;

    const top = placeBottom ? "" : (windowOffset.top + this.controlEl.offsetHeight + 2) + "px";
    const bottom = placeBottom ? (window.innerHeight - windowOffset.top) + "px" : "";
    const left = placeRight ? "" : windowOffset.left + "px";
    const right = placeRight ? (window.innerWidth - windowOffset.left - this.controlEl.offsetWidth) + "px" : "";
    const minWidth = this.controlEl.offsetWidth + "px";
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
      this.dropdownEl.style,
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


    /*if (window.innerHeight < this.controlEl.windowOffset.top * 2) {
      Object.assign(
        this.dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - this.controlEl.windowOffset.top) + "px",
          left: this.controlEl.windowOffset.left + 1 + "px",
          minWidth: this.controlEl.clientWidth + "px",
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
        this.dropdownEl.style,
        {
          top: (this.controlEl.windowOffset.top + this.controlEl.offsetHeight) + "px",
          bottom: "",
          left: this.controlEl.windowOffset.left + 1 + "px",
          minWidth: this.controlEl.clientWidth + "px",
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

    if (!this.dropdownEl) throw new NeverEntryError();

    Object.assign(
      this.dropdownEl.style,
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
    if (!this.dropdownEl) throw new NeverEntryError();
    if (!this.controlEl) throw new NeverEntryError();

    if (this.el.findParent(event.target as HTMLElement)) {
      const windowOffset = this.controlEl.getRelativeOffset(window.document.body);

      if (window.innerHeight < windowOffset.top * 2) {
        Object.assign(
          this.dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - windowOffset.top) + "px",
            left: windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          this.dropdownEl.style,
          {
            top: (windowOffset.top + this.controlEl.offsetHeight) + "px",
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
      if (!this._isOpen) {
        event.preventDefault();
        event.stopPropagation();

        this.openPopup();
      }
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
    if (!this.dropdownEl) throw new NeverEntryError();
    if (!this.controlEl) throw new NeverEntryError();

    const relatedTarget = event.relatedTarget as HTMLElement | undefined;
    if (
      relatedTarget != null && (
        relatedTarget === this.controlEl
        || relatedTarget === this.dropdownEl
        || relatedTarget.findParent(this.controlEl)
        || relatedTarget.findParent(this.dropdownEl)
      )
    ) {
      return;
    }

    if (
      relatedTarget == null
      && this._mouseoverEl instanceof HTMLElement
      && (this._mouseoverEl.findParent(this.controlEl) || this._mouseoverEl.findParent(this.dropdownEl))
    ) {
      const firstFocusableEl = this.controlEl.isFocusable() ? this.controlEl : this.controlEl.findFocusableAll()[0];
      if (typeof firstFocusableEl !== "undefined") {
        firstFocusableEl.focus();
        return;
      }
      else {
        const firstFocusableEl1 = this.dropdownEl.isFocusable() ? this.dropdownEl : this.dropdownEl.findFocusableAll()[0];
        if (typeof firstFocusableEl1 !== "undefined") {
          firstFocusableEl1.focus();
          return;
        }
      }
    }

    this.closePopup();
  };
}
