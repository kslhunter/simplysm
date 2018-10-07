import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdComboboxItemControl} from "./SdComboboxItemControl";

@Component({
  selector: "sd-combobox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-textfield #textfield
                  [value]="text"
                  (valueChange)="onTextChange($event)"
                  [required]="required"
                  [disabled]="disabled"
                  (focusedChange)="textfieldFocusedChange.emit($event)">
    </sd-textfield>
    <div class="_icon" *ngIf="!disabled">
      <sd-icon [fixedWidth]="true" [icon]="'angle-down'"></sd-icon>
    </div>
    <div #dropdown class="_sd-combobox-dropdown" tabindex="0">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      overflow: visible;
      position: relative;

      > ._icon {
        position: absolute;
        top: 1px;
        right: 1px;
        padding: gap(sm) 0;
        width: 30px;
        text-align: center;
        pointer-events: none;
      }

      > sd-textfield /deep/ > input {
        padding-right: 30px !important;
      }
    }

    /deep/ ._sd-combobox-dropdown {
      position: fixed;
      z-index: $z-index-dropdown;
      opacity: 0;
      transform: translateY(-10px);
      transition: .1s linear;
      transition-property: transform, opacity;
      pointer-events: none;
      background: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
      border-radius: 2px;
      min-width: 120px;

      &:focus {
        outline: 1px solid theme-color(primary, default);
      }
    }
  `]
})
export class SdComboboxControl implements OnInit, OnDestroy {
  @Input()
  public value?: any;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<any | undefined>();

  @Input()
  @SdTypeValidate(String)
  public text?: string;

  @Output()
  public readonly textChange = new EventEmitter<string | undefined>();

  @Output()
  public readonly textChangeByInput = new EventEmitter<string | undefined>();

  @ContentChildren(SdComboboxItemControl, {descendants: true})
  public itemControls?: QueryList<SdComboboxItemControl>;

  @ViewChild("textfield", {read: ElementRef})
  public textfieldElRef?: ElementRef<HTMLElement>;

  @ViewChild("dropdown")
  public dropdownElRef?: ElementRef<HTMLDivElement>;

  @Output()
  public readonly textfieldFocusedChange = new EventEmitter<boolean>();

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngOnInit(): void {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    document.body.appendChild(dropdownEl);

    textfieldEl.addEventListener("focus", this.focusEventHandler, true);
    textfieldEl.addEventListener("blur", this.blurEventHandler, true);
    dropdownEl.addEventListener("blur", this.blurEventHandler, true);
  }

  public ngOnDestroy(): void {
    this.dropdownElRef!.nativeElement.remove();
  }

  public onTextChange(text: string): void {
    this.text = text;
    this.textChange.emit(this.text);
    this.textChangeByInput.emit(this.text);

    if (this.value !== undefined) {
      this.value = undefined;
      this.valueChange.emit(this.value);
    }
  }

  public setValueFromItemControl(value: any, itemControl: SdComboboxItemControl): void {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
    }

    if (this.text !== itemControl.content) {
      this.text = itemControl.content;
      this.textChange.emit(this.text);
    }
  }

  public scrollEventHandler = (event: UIEvent) => {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    if (this._elRef.nativeElement.findParent(event.target as HTMLElement)) {

      if (window.innerHeight < textfieldEl.windowOffset.top * 2) {
        Object.assign(
          dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - textfieldEl.windowOffset.top) + "px",
            left: textfieldEl.windowOffset.left + "px"
          }
        );
      }
      else {
        Object.assign(
          dropdownEl.style,
          {
            top: (textfieldEl.windowOffset.top + textfieldEl.offsetHeight) + "px",
            bottom: "",
            left: textfieldEl.windowOffset.left + "px"
          }
        );
      }
    }
  };

  public focusEventHandler = (event: FocusEvent) => {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    if (window.innerHeight < textfieldEl.windowOffset.top * 2) {
      Object.assign(
        dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - textfieldEl.windowOffset.top) + "px",
          left: textfieldEl.windowOffset.left + "px",
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
          top: (textfieldEl.windowOffset.top + textfieldEl.offsetHeight) + "px",
          bottom: "",
          left: textfieldEl.windowOffset.left + "px",
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

    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    const relatedTarget = event.relatedTarget as HTMLElement;
    if (
      relatedTarget &&
      (
        relatedTarget === textfieldEl ||
        relatedTarget === dropdownEl ||
        relatedTarget.findParent(textfieldEl) ||
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

    if (!this.value && this.text) {
      this.text = undefined;
      this.textChange.emit(this.text);
      return;
    }

    if (this.value) {
      const selectedItemControl = this.itemControls!.find(item => item.value === this.value);

      if (selectedItemControl) {
        const text = selectedItemControl.content;
        if (text !== this.text) {
          this.text = text || "";
          this.textChange.emit(this.text);
        }
      }
    }
  };
}