import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef
} from "@angular/core";
import {SdSelectControl} from "./SdSelectControl";
import {coercionBoolean} from "../utils/commons";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdGapControl} from "./SdGapControl";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    SdCheckboxControl,
    NgTemplateOutlet,
    SdGapControl
  ],
  template: `
    <ng-container *ngIf="selectMode === 'multi'">
      <sd-checkbox [value]="isSelected" inline></sd-checkbox>
      <sd-gap width="sm"/>
    </ng-container>

    <div class="_content" style="display: inline-block;">
      <ng-container *ngIf="!labelTemplateRef">
        <ng-content/>
      </ng-container>
      <ng-container *ngIf="labelTemplateRef">
        <ng-template [ngTemplateOutlet]="labelTemplateRef"/>
      </ng-container>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      transition: background .1s ease-in;
      background: white;

      @media all and (pointer: coarse) {
        @include active-effect(true);
      }

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
        color: var(--theme-primary-default);
        font-weight: bold;
        background: var(--theme-primary-lightest);
      }

      &[sd-disabled=true] {
        background: var(--theme-grey-default);
        opacity: .3;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }
      }
    }
  `]
})
export class SdSelectItemControl<T> implements OnInit, OnDestroy, DoCheck {
  @HostBinding("attr.tabindex")
  tabIndex = 0;

  @Input()
  value!: T;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @ContentChild("label", {static: true})
  labelTemplateRef?: TemplateRef<void>;

  #cdr = inject(ChangeDetectorRef);
  #selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));

  elRef: ElementRef<HTMLElement> = inject(ElementRef);

  @HostBinding("attr.sd-select-mode")
  selectMode: "single" | "multi" = "single";

  @HostBinding("attr.sd-selected")
  isSelected = false;

  ngOnInit(): void {
    this.#selectControl.itemControls.push(this);
  }

  ngDoCheck(): void {
    this.selectMode = this.#selectControl.selectMode;
    this.isSelected = this.#selectControl.getIsSelectedItemControl(this);
    this.#cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.#selectControl.itemControls.remove(this);
  }

  @HostListener("click", ["$event"])
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) return;

    this.#selectControl.onItemControlClick(this, this.selectMode === "single");
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, false);
    }
    if (!event.ctrlKey && !event.altKey && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, this.selectMode === "single");
    }
  }

  markForCheck() {
    this.#cdr.markForCheck();
  }
}
