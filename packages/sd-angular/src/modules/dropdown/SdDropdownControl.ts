import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_sd-dropdown-control" [attr.tabindex]="disabled ? undefined : '0'">
      <ng-content></ng-content>
    </div>
    <ng-content select="sd-dropdown-popup"></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-dropdown {
      > div {
        position: relative;
      }
    }
  `]
})
export class SdDropdownControl implements OnInit, OnDestroy {
  @Input()
  @HostBinding("attr.sd-disabled")
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  private _isOpen = false;

  private readonly _el: HTMLElement;
  private _controlEl!: HTMLElement;
  private _dropdownEl!: HTMLElement;

  private _mouseoverEl?: HTMLElement;

  public mouseoverEventHandler = (event: MouseEvent) => {
    this._mouseoverEl = event.target as HTMLElement;
  };

  public get isDropdownLocatedTop(): boolean {
    return this._controlEl ? window.innerHeight < this._controlEl.windowOffset.top * 2 : false;
  }

  public constructor(private readonly _elRef: ElementRef) {
    this._el = (this._elRef.nativeElement as HTMLElement);
  }

  public ngOnInit(): void {
    this._controlEl = this._el.findAll("> ._sd-dropdown-control")[0] as HTMLElement;
    this._dropdownEl = this._el.findAll("> sd-dropdown-popup")[0] as HTMLElement;

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

    document.body.appendChild(this._dropdownEl);
    this._dropdownEl.addEventListener("blur", this.blurEventHandler, true);

    const placeBottom = window.innerHeight < this._controlEl.windowOffset.top * 2;
    const placeRight = window.innerWidth < this._controlEl.windowOffset.left * 2;

    const top = placeBottom ? "" : (this._controlEl.windowOffset.top + this._controlEl.offsetHeight) + "px";
    const bottom = placeBottom ? (window.innerHeight - this._controlEl.windowOffset.top) + "px" : "";
    const left = placeRight ? "" : this._controlEl.windowOffset.left + 1 + "px";
    const right = placeRight ? (window.innerWidth - this._controlEl.windowOffset.left - this._controlEl.clientWidth) + "px" : "";
    const minWidth = this._controlEl.clientWidth + "px";
    const opacity = "1";
    const pointerEvents = "auto";
    const transform = "none";
    const borderTopRightRadius = placeBottom ? "4px" : "";
    const borderTopLeftRadius = placeBottom ? "4px" : "";
    const borderBottomRightRadius = placeBottom ? "" : "4px";
    const borderBottomLeftRadius = placeBottom ? "" : "4px";

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
        transform,
        borderTopRightRadius,
        borderTopLeftRadius,
        borderBottomRightRadius,
        borderBottomLeftRadius
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

  public scrollEventHandler = (event: Event) => {
    if (this._el.findParent(event.target as HTMLElement)) {
      if (window.innerHeight < this._controlEl.windowOffset.top * 2) {
        Object.assign(
          this._dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - this._controlEl.windowOffset.top) + "px",
            left: this._controlEl.windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          this._dropdownEl.style,
          {
            top: (this._controlEl.windowOffset.top + this._controlEl.offsetHeight) + "px",
            bottom: "",
            left: this._controlEl.windowOffset.left + "px"
          }
        );
      }
    }
  };

  public clickEventHandler = (event: MouseEvent) => {
    if (this._isOpen) {
      this.closePopup();
    }
    else {
      this.openPopup();
    }
  };

  public keydownEventHandler = (event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.altKey && event.key === "ArrowDown") {
      this.openPopup();
    }

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      if (this._isOpen) {
        this.closePopup();
      }
      else {
        this.openPopup();
      }
    }
  };

  public blurEventHandler = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (
      relatedTarget && (
        relatedTarget === this._controlEl ||
        relatedTarget === this._dropdownEl ||
        relatedTarget.findParent(this._controlEl) ||
        relatedTarget.findParent(this._dropdownEl)
      )
    ) {
      return;
    }

    if (this._mouseoverEl && (this._mouseoverEl.findParent(this._controlEl) || this._mouseoverEl.findParent(this._dropdownEl))) {
      const firstFocusableEl = this._controlEl.findFocusableAllIncludeMe()[0];
      if (firstFocusableEl) {
        firstFocusableEl.focus();
        return;
      }
      else {
        const firstFocusableEl1 = this._dropdownEl.findFocusableAllIncludeMe()[0];
        if (firstFocusableEl1) {
          firstFocusableEl1.focus();
          return;
        }
      }
    }

    this.closePopup();
  };
}
