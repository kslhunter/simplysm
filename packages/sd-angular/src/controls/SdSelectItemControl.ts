import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  TemplateRef
} from "@angular/core";
import {SdSelectControl} from "./SdSelectControl";
import {JsonConvert} from "@simplysm/sd-core-common";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="selectMode === 'multi'">
      <sd-checkbox [value]="isSelected" inline="text"></sd-checkbox>
    </ng-container>

    <span class="_label">
      <ng-content></ng-content>
    </span>
    <span class="_labelTemplate" hidden *ngIf="labelTemplateRef">
      <ng-template [ngTemplateOutlet]="labelTemplateRef"></ng-template>
    </span>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      transition: background .1s ease-in;
      background: white;

      &:hover {
        transition: background .1s ease-out;
        background: rgba(0, 0, 0, .07);
      }

      &:focus {
        outline: none;
        transition: background .1s ease-out;
        background: rgba(0, 0, 0, .07);
      }

      &._selected {
        color: var(--theme-color-primary-default);
        font-weight: bold;
        background: rgba(0, 0, 0, .07);
      }
    }
  `]
})
export class SdSelectItemControl {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public set value(value: any) {
    this._value = value;

    this._el.setAttribute("sd-value-json", JsonConvert.stringify(value) ?? "");
  }

  public get value(): any {
    return this._value;
  }

  private _value: any;

  @ContentChild("label", {static: true})
  public labelTemplateRef?: TemplateRef<any>;

  @HostBinding("attr.sd-select-mode")
  public get selectMode(): "single" | "multi" {
    return this._selectControl.selectMode;
  }

  @HostBinding("class._selected")
  public get isSelected(): boolean {
    const keyProp = this._selectControl.keyProp;
    const parentValue = this._selectControl.value;

    if (this.selectMode === "multi") {
      const parentKeyValues = keyProp !== undefined && parentValue !== undefined ? parentValue.map((item: any) => item[keyProp]) : parentValue;
      const itemKeyValue = keyProp !== undefined && this.value !== undefined ? this.value[keyProp] : this.value;
      return parentKeyValues.includes(itemKeyValue);
    }
    else {
      const parentKeyValue = keyProp !== undefined && parentValue !== undefined ? parentValue[keyProp] : parentValue;
      const itemKeyValue = keyProp !== undefined && this.value !== undefined ? this.value[keyProp] : this.value;
      return parentKeyValue === itemKeyValue;
    }
  }

  public get content(): string {
    return (this._elRef.nativeElement as HTMLElement).innerHTML.trim();
  }

  private readonly _el: HTMLElement;

  public constructor(@Inject(forwardRef(() => SdSelectControl))
                     private readonly _selectControl: SdSelectControl,
                     private readonly _elRef: ElementRef) {
    this._el = (this._elRef.nativeElement as HTMLElement);
  }

  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this._selectControl.setValue(this.value);
  }
}
