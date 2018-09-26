import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from "@angular/core";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-dropdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #control [attr.tabindex]="disabled ? undefined : '0'">
      <ng-content></ng-content>
    </div>
    <div *ngIf="false">
      <ng-content select="sd-dropdown-popup"></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      > div {
        position: relative;
      }
    }
  `]
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

  /*public focused = false;*/

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngOnInit(): void {
    const controlEl = this.controlElRef!.nativeElement;
    controlEl.addEventListener("focus", this.focusEventHandler, true);
    controlEl.addEventListener("blur", this.blurEventHandler, true);
  }

  public ngOnDestroy(): void {
    this.dropdownElRef!.nativeElement.remove();
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

    Object.assign(
      dropdownEl.style,
      {
        opacity: "0",
        pointerEvents: "none",
        transform: "translateY(-10px)"
      }
    );
  };
}