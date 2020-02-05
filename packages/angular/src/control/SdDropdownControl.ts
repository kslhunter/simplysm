import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from "@angular/core";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {SdTypeValidate} from "../decorator/SdTypeValidate";


@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sd-dropdown-control" #control [attr.tabindex]="disabled ? undefined : '0'">
      <ng-content></ng-content>
    </div>
    <div *ngIf="false">
      <ng-content select="sd-dropdown-popup"></ng-content>
    </div>`
})
export class SdDropdownControl implements OnInit, OnDestroy {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @ViewChild("control")
  public controlElRef?: ElementRef<HTMLElement>;

  @ContentChild(SdDropdownPopupControl, {read: ElementRef})
  public dropdownElRef?: ElementRef<HTMLElement>;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  private _isOpen = false;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngOnInit(): void {
    const controlEl = this.controlElRef!.nativeElement;
    controlEl.addEventListener("focus", this.focusEventHandler, true);
    controlEl.addEventListener("blur", this.blurEventHandler, true);

    const dropdownEl = this.dropdownElRef!.nativeElement;
    dropdownEl.remove();
  }

  public ngOnDestroy(): void {
    this.dropdownElRef!.nativeElement.remove();
  }

  public openPopup(): void {
    const controlEl = this.controlElRef!.nativeElement;

    const dropdownEl = this.dropdownElRef!.nativeElement;
    document.body.appendChild(dropdownEl);
    dropdownEl.addEventListener("blur", this.blurEventHandler, true);

    if (window.innerHeight < controlEl.windowOffset.top * 2) {
      Object.assign(
        dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - controlEl.windowOffset.top) + "px",
          left: controlEl.windowOffset.left + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none"
        }
      );
    }
    else {
      Object.assign(
        dropdownEl.style,
        {
          top: (controlEl.windowOffset.top + controlEl.offsetHeight) + "px",
          bottom: "",
          left: controlEl.windowOffset.left + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none"
        }
      );
    }

    document.addEventListener("scroll", this.scrollEventHandler, true);

    if (!this._isOpen) {
      this.open.emit();
      this._isOpen = true;
    }
  }

  public closePopup(): void {
    const dropdownEl = this.dropdownElRef!.nativeElement;
    Object.assign(
      dropdownEl.style,
      {
        opacity: "0",
        pointerEvents: "none",
        transform: "translateY(-10px)"
      }
    );

    if (this._isOpen) {
      this.close.emit();
      this._isOpen = false;
      dropdownEl.remove();
    }
  }

  public scrollEventHandler = (event: UIEvent) => {
    const controlEl = this.controlElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    if (this._elRef.nativeElement.findParent(event.target as HTMLElement)) {
      if (window.innerHeight < controlEl.windowOffset.top * 2) {
        Object.assign(
          dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - controlEl.windowOffset.top) + "px",
            left: controlEl.windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          dropdownEl.style,
          {
            top: (controlEl.windowOffset.top + controlEl.offsetHeight) + "px",
            bottom: "",
            left: controlEl.windowOffset.left + "px"
          }
        );
      }
    }
  };

  public focusEventHandler = (event: FocusEvent) => {
    this.openPopup();
  };

  public blurEventHandler = (event: FocusEvent) => {
    document.removeEventListener("scroll", this.scrollEventHandler, true);

    const controlEl = this.controlElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    const relatedTarget = event.relatedTarget as HTMLElement;
    if (
      relatedTarget &&
      (
        relatedTarget === controlEl ||
        relatedTarget === dropdownEl ||
        relatedTarget.findParent(controlEl) ||
        relatedTarget.findParent(dropdownEl)
      )
    ) {
      return;
    }

    this.closePopup();
  };
}
