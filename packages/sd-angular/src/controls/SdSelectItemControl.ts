import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./SdSelectControl";
import { coercionBoolean } from "../utils/commons";
import { NgTemplateOutlet } from "@angular/common";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdGapControl } from "./SdGapControl";
import { sdDestroy, sdInit } from "../utils/hooks";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, NgTemplateOutlet, SdGapControl],
  template: `
    @if (selectMode === "multi") {
      <sd-checkbox [value]="isSelected" inline></sd-checkbox>
      <sd-gap width="sm" />
    }

    <div class="_content" style="display: inline-block;">
      @if (!labelTemplateRef) {
        <ng-content />
      } @else {
        <ng-template [ngTemplateOutlet]="labelTemplateRef" />
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select-item {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        transition: background 0.1s ease-in;
        background: white;

        @media all and (pointer: coarse) {
          @include active-effect(true);
        }

        &:hover {
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &:focus {
          outline: none;
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &[sd-selected="true"] {
          color: var(--theme-primary-default);
          font-weight: bold;
          //background: var(--theme-primary-lightest);
          background: rgba(0, 0, 0, 0.07);
        }

        &[sd-disabled="true"] {
          background: var(--theme-grey-default);
          opacity: 0.3;

          @media all and (pointer: coarse) {
            @include active-effect(false);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-select-mode]": "selectMode",
    "[attr.sd-selected]": "isSelected",
  },
})
export class SdSelectItemControl {
  #cdr = inject(ChangeDetectorRef);
  #selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));
  elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() value!: any;
  @Input({ transform: coercionBoolean }) disabled = false;

  @ContentChild("label", { static: true }) labelTemplateRef?: TemplateRef<void>;

  get selectMode() {
    return this.#selectControl.selectMode;
  }

  get isSelected() {
    return this.#selectControl.getIsSelectedItemControl(this);
  }

  constructor() {
    sdInit(this, () => {
      this.#selectControl.itemControls.push(this);
    });

    sdDestroy(this, () => {
      this.#selectControl.itemControls.remove(this);
    });
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
