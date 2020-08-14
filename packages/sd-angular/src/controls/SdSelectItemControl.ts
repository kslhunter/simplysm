import {
  AfterContentChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  Output,
  TemplateRef
} from "@angular/core";
import { SdSelectControl } from "./SdSelectControl";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="selectMode === 'multi'">
      <sd-checkbox [value]="isSelected" inline="text" inset></sd-checkbox>
    </ng-container>

    <div class="_content" style="display: inline-block;">
      <ng-container *ngIf="!labelTemplateRef">
        <ng-content></ng-content>
      </ng-container>
      <ng-container *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"></ng-template>
      </ng-container>
    </div>`,
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

      &[sd-selected=true] {
        color: var(--theme-color-primary-default);
        font-weight: bold;
        background: var(--theme-color-primary-lightest);
      }
    }
  `]
})
export class SdSelectItemControl implements AfterViewInit, AfterContentChecked {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  @ContentChild("label", { static: true })
  public labelTemplateRef?: TemplateRef<any>;

  @HostBinding("attr.sd-select-mode")
  public get selectMode(): "single" | "multi" {
    return this._selectControl.selectMode;
  }

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._selectControl.getIsSelectedItemControl(this);
  }

  public contentHTML = "";
  public el: HTMLElement;

  @Output()
  public readonly contentHTMLChange = new EventEmitter<string>();

  public constructor(@Inject(forwardRef(() => SdSelectControl))
                     private readonly _selectControl: SdSelectControl,
                     private readonly _elRef: ElementRef,
                     private readonly _cdr: ChangeDetectorRef) {
    this.el = this._elRef.nativeElement;
  }

  public ngAfterViewInit(): void {
    this.contentHTML = this.el.findFirst("> ._content")?.innerHTML ?? "";
    this._selectControl.onItemControlContentChanged(this);
  }

  public ngAfterContentChecked(): void {
    const newContentHTML = this.el.findFirst("> ._content")?.innerHTML ?? "";
    if (newContentHTML !== this.contentHTML) {
      this.contentHTML = newContentHTML;
      this._selectControl.onItemControlContentChanged(this);
    }
  }

  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this._selectControl.onItemControlClick(this);
  }

  public markForCheck(): void {
    this._cdr.markForCheck();
  }
}
