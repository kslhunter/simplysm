import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sd-dropdown-control" tabindex="0">
      <ng-content></ng-content>
    </div>
    <ng-content select="sd-dropdown-popup"></ng-content>`
})
export class SdDropdownControl implements OnInit, OnDestroy {
  @Input()
  @SdTypeValidate(Boolean)
  public set disabled(value: boolean) {
    this._disabled = value;

    if (value) {
      this._el.setAttribute("sd-disabled", "true");
      if (this._controlEl) this._controlEl.removeAttribute("tabindex");
    }
    else {
      this._el.setAttribute("sd-disabled", "false");
      if (this._controlEl) this._controlEl.setAttribute("tabindex", "0");
    }
  }

  public get disabled(): boolean {
    return this._disabled;
  }

  private _disabled = false;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  private _isOpen = false;

  private readonly _el: HTMLElement;
  private _controlEl!: HTMLElement;
  private _dropdownEl!: HTMLElement;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
    this._el = this._elRef.nativeElement;
  }

  public ngOnInit(): void {
    this._controlEl = this._el.findAll("> ._sd-dropdown-control")[0] as HTMLElement;
    this._dropdownEl = this._el.findAll("> sd-dropdown-popup")[0] as HTMLElement;

    this._controlEl.addEventListener("focus", this.focusEventHandler, true);
    this._controlEl.addEventListener("blur", this.blurEventHandler, true);

    this._dropdownEl.remove();

    this.disabled = this._disabled;
  }

  public ngOnDestroy(): void {
    if (this._dropdownEl) {
      this._dropdownEl.remove();
      document.removeEventListener("scroll", this.scrollEventHandler, true);
    }
  }

  public openPopup(): void {
    if (this._isOpen) return;
    this._isOpen = true;

    document.body.appendChild(this._dropdownEl);
    this._dropdownEl.addEventListener("blur", this.blurEventHandler, true);

    if (window.innerHeight < this._controlEl.windowOffset.top * 2) {
      Object.assign(
        this._dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - this._controlEl.windowOffset.top) + "px",
          left: this._controlEl.windowOffset.left + 1 + "px",
          minWidth: this._controlEl.clientWidth + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none",
          borderTopRightRadius: "4px",
          borderTopLeftRadius: "4px"
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
          transform: "none",
          borderBottomRightRadius: "4px",
          borderBottomLeftRadius: "4px"
        }
      );
    }

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

  public scrollEventHandler = (event: UIEvent) => {
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

  public focusEventHandler = (event: FocusEvent) => {
    this.openPopup();
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
    this.closePopup();
  };
}
