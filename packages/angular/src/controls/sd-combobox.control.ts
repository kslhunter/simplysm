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
import {SdTypeValidate} from "..";
import {SdComboboxItemControl} from "./sd-combobox-item.control";

@Component({
  selector: "sd-combobox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-textfield #textfield
                  [value]="text"
                  (valueChange)="onTextChange($event)"
                  [required]="required"
                  (focusedChange)="textfieldFocusedChange.emit($event)">
    </sd-textfield>
    <div #dropdown class="_sd-combobox-dropdown" tabindex="0">
      <ng-content></ng-content>
    </div> `,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      overflow: visible;
    }

    /deep/ ._sd-combobox-dropdown {
      position: fixed;
      opacity: 0;
      transform: translateY(-10px);
      transition: .1s linear;
      transition-property: transform, opacity;
      pointer-events: none;
      background: theme-color(bluegrey, darkest);
      min-width: 120px;
    }
  `]
})
export class SdComboboxControl implements OnInit, OnDestroy {
  @Input()
  public value?: any;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<any | undefined>();

  @Input()
  @SdTypeValidate(String)
  public text?: string;

  @Output()
  public readonly textChange = new EventEmitter<string | undefined>();

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
      Object.assign(
        dropdownEl.style,
        {
          top: (textfieldEl.windowOffset.top + textfieldEl.offsetHeight) + "px",
          left: textfieldEl.windowOffset.left + "px"
        }
      );
    }
  };

  public focusEventHandler = (event: FocusEvent) => {
    const textfieldEl = this.textfieldElRef!.nativeElement;
    const dropdownEl = this.dropdownElRef!.nativeElement;

    Object.assign(
      dropdownEl.style,
      {
        top: (textfieldEl.windowOffset.top + textfieldEl.offsetHeight) + "px",
        left: textfieldEl.windowOffset.left + "px",
        opacity: "1",
        pointerEvents: "auto",
        transform: "none"
      }
    );
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