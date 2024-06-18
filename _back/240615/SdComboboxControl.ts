import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdComboboxItemControl} from "./SdComboboxItemControl";
import {NumberUtil} from "@simplysm/sd-core-common";
import {coercionBoolean} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdTextfieldControl} from "./SdTextfieldControl";
import {SdIconControl} from "./SdIconControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-combobox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdIconControl,
  ],
  template: `
    <sd-textfield #textfield
                  type="text"
                  [value]="text"
                  (valueChange)="onTextChange($event)"
                  [required]="required"
                  [disabled]="disabled"
                  (focus)="onTextfieldFocus($event)"
                  (blur)="onChildBlur($event)">
    </sd-textfield>
    <div class="_icon" *ngIf="!disabled">
      <sd-icon [icon]="icons.caretDown" fixedWidth/>
    </div>
    <div class="_sd-combobox-dropdown" tabindex="0"
         (blur)="onChildBlur($event)">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      overflow: visible;
      position: relative;

      > ._icon {
        position: absolute;
        top: 1px;
        right: 1px;
        padding: var(--gap-sm) 0;
        width: 30px;
        text-align: center;
        pointer-events: none;
      }

      > sd-textfield > input {
        padding-right: 30px !important;
      }
    }

    ._sd-combobox-dropdown {
      position: fixed;
      z-index: var(--z-index-dropdown);
      opacity: 0;
      transform: translateY(-10px);
      transition: .1s linear;
      transition-property: transform-opacity;
      pointer-events: none;
      background: white;
      @include elevation(6);
      min-width: 120px;

      &:focus {
        outline: 1px solid var(--theme-primary-default);
      }
    }
  `]
})
export class SdComboboxControl<T> implements OnInit, OnDestroy, DoCheck {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input()
  value!: T;

  @Input({transform: coercionBoolean})
  required = false;

  @Input({transform: coercionBoolean})
  disabled = false;

  @Output()
  valueChange = new EventEmitter<T>();

  @Input()
  text?: string;

  @Output()
  textChange = new EventEmitter<string | undefined>();

  @Output()
  textChangeByInput = new EventEmitter<string | undefined>();

  @ContentChildren(SdComboboxItemControl, {descendants: true})
  itemControls?: QueryList<SdComboboxItemControl<T>>;

  @ViewChild("textfield", {static: true, read: ElementRef})
  textfieldElRef?: ElementRef<HTMLElement>;

  @ViewChild("dropdown", {static: true})
  dropdownElRef?: ElementRef<HTMLDivElement>;

  @Output()
  open = new EventEmitter();

  @Output()
  close = new EventEmitter();

  @Input({transform: coercionBoolean})
  userCustomText = false;

  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        itemControls: [this.itemControls, "one"]
      }, () => {
        this.#refreshText();
      });
    });
  }

  ngOnInit() {
    if (this.userCustomText) {
      const newText = this.value != null ? this.value.toString() : undefined;
      if (this.textChange.observed) {
        this.textChange.emit(newText);
      }
      else {
        this.text = newText;
      }
    }
  }

  ngOnDestroy() {
    this.dropdownElRef!.nativeElement.remove();
  }

  onTextChange(text: string | undefined) {
    if (this.textChange.observed) {
      this.textChange.emit(text);
    }
    else {
      this.text = text;
    }
    this.textChangeByInput.emit(text);

    if (this.value != null) {
      if (this.userCustomText) {
        const newValue = NumberUtil.parseInt(text) as T;
        if (this.valueChange.observed) {
          this.valueChange.emit(newValue);
        }
        else {
          this.value = newValue;
        }
      }
      else {
        const newValue = undefined as T;
        if (this.valueChange.observed) {
          this.valueChange.emit(newValue);
        }
        else {
          this.value = newValue;
        }
      }
    }
    else {
      if (this.userCustomText) {
        const newValue = NumberUtil.parseInt(text) as T;
        if (this.valueChange.observed) {
          this.valueChange.emit(newValue);
        }
        else {
          this.value = newValue;
        }
      }
    }
  }

  setValueFromItemControl(value: T, itemControl: SdComboboxItemControl<T>) {
    if (this.value !== value) {
      if (this.valueChange.observed) {
        this.valueChange.emit(value);
      }
      else {
        this.value = value;
      }
      this.closePopup();
    }

    if (this.text !== itemControl.content) {
      const newText = itemControl.content;
      if (this.textChange.observed) {
        this.textChange.emit(newText);
      }
      else {
        this.text = newText;
      }
    }
  }

  openPopup() {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;
    document.body.appendChild(dropdownEl);

    if (window.innerHeight < textfieldEl.getRelativeOffset(window.document.body).top * 2) {
      Object.assign(
        dropdownEl.style,
        {
          top: "",
          bottom: (window.innerHeight - textfieldEl.getRelativeOffset(window.document.body).top) + "px",
          left: textfieldEl.getRelativeOffset(window.document.body).left + "px",
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
          top: (textfieldEl.getRelativeOffset(window.document.body).top + textfieldEl.offsetHeight) + "px",
          bottom: "",
          left: textfieldEl.getRelativeOffset(window.document.body).left + "px",
          opacity: "1",
          pointerEvents: "auto",
          transform: "none"
        }
      );
    }

    this.open.emit();
  }

  closePopup() {
    const dropdownEl = this.dropdownElRef!.nativeElement;
    try {
      // dropdownEl.remove();
    }
    catch (err) {
      if (err instanceof Error) {
        if (!err.message.includes("no longer a child of this node")) {
          throw err;
        }
      }
      else {
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

    if (this.value == null && this.text != null) {
      const newText = this.userCustomText ? this.text : undefined;
      if (this.textChange.observed) {
        this.textChange.emit(newText);
      }
      else {
        this.text = newText;
      }
      return;
    }

    this.#refreshText();
    this.close.emit();
  }

  @HostListener("document:scroll", ["$event"])
  onDocumentScroll(event: Event) {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    if (this.#elRef.nativeElement.findParent(event.target as HTMLElement)) {
      if (window.innerHeight < textfieldEl.getRelativeOffset(window.document.body).top * 2) {
        Object.assign(
          dropdownEl.style,
          {
            top: "",
            bottom: (window.innerHeight - textfieldEl.getRelativeOffset(window.document.body).top) + "px",
            left: textfieldEl.getRelativeOffset(window.document.body).left + "px"
          }
        );
      }
      else {
        Object.assign(
          dropdownEl.style,
          {
            top: (textfieldEl.getRelativeOffset(window.document.body).top + textfieldEl.offsetHeight) + "px",
            bottom: "",
            left: textfieldEl.getRelativeOffset(window.document.body).left + "px"
          }
        );
      }
    }
  };

  onTextfieldFocus(event: FocusEvent) {
    this.openPopup();
  };


  onChildBlur(event: FocusEvent) {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (
      relatedTarget != null
      && (
        relatedTarget === textfieldEl
        || relatedTarget === dropdownEl
        || relatedTarget.findParent(textfieldEl)
        || relatedTarget.findParent(dropdownEl)
      )
    ) {
      return;
    }

    this.closePopup();
  };

  #refreshText() {
    if (this.value != null) {
      if (!this.userCustomText) {
        const selectedItemControl = this.itemControls!.find((item) => item.value === this.value);

        if (selectedItemControl) {
          const text = selectedItemControl.content;
          if (text !== this.text) {
            if (this.textChange.observed) {
              this.textChange.emit(text);
            }
            else {
              this.text = text;
            }
          }
        }
      }
    }
  }
}
