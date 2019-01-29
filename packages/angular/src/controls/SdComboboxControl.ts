import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdComboboxItemControl} from "./SdComboboxItemControl";
import {SdTypeValidate} from "../commons/SdTypeValidate";

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
      <sd-icon [fw]="true" [icon]="'caret-down'"></sd-icon>
    </div>
    <div #dropdown class="_sd-combobox-dropdown" tabindex="0">
      <ng-content></ng-content>
    </div>`
})
export class SdComboboxControl implements OnInit, OnDestroy, AfterContentChecked {
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

  private readonly _iterableDiffer: IterableDiffer<SdComboboxItemControl>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _cdr: ChangeDetectorRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((i, itemControl) => itemControl.value);
  }

  public ngAfterContentChecked(): void {
    if (this.itemControls && this._iterableDiffer.diff(this.itemControls.toArray())) {
      this._refreshText();
      this._cdr.markForCheck();
    }
  }

  public ngOnInit(): void {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

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
      this.closePopup();
    }

    if (this.text !== itemControl.content) {
      this.text = itemControl.content;
      this.textChange.emit(this.text);
    }
  }

  public openPopup(): void {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;
    document.body.appendChild(dropdownEl);

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
  }

  public closePopup(): void {
    const dropdownEl = this.dropdownElRef!.nativeElement;
    try {
      dropdownEl.remove();
    }
    catch (err) {
      if (!err.message.includes("no longer a child of this node")) {
        throw err;
      }
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

    this._refreshText();
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
    this.openPopup();
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

    this.closePopup();
  };

  private _refreshText(): void {
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
  }
}
