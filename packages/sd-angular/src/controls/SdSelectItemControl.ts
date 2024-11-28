import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  HostListener,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./SdSelectControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdGapControl } from "./SdGapControl";
import { $computed, $effect } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { useRipple } from "../utils/useRipple";
import { transformBoolean } from "../utils/transforms";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, NgTemplateOutlet, SdGapControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select-item {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        transition: background 0.1s ease-in;
        background: white;

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
        }
      }
    `,
  ],
  template: `
    @if (selectMode() === "multi") {
      <sd-checkbox [value]="isSelected()" [inline]="true"></sd-checkbox>
      <sd-gap width="sm" />
    }

    <div class="_content" style="display: inline-block;">
      @if (!labelTemplateRef()) {
        <ng-content />
      } @else {
        <ng-template [ngTemplateOutlet]="labelTemplateRef()!" />
      }
    </div>
  `,
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-select-mode]": "selectMode()",
    "[attr.sd-selected]": "isSelected()",
  },
})
export class SdSelectItemControl {
  #selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));
  elRef = injectElementRef<HTMLElement>();

  value = input<any>();
  disabled = input(false, { transform: transformBoolean });

  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });

  selectMode = $computed(() => this.#selectControl.selectMode());
  isSelected = $computed(() => this.#selectControl.getIsSelectedItemControl(this));

  constructor() {
    useRipple(() => !this.disabled());

    $effect((onCleanup) => {
      this.#selectControl.itemControls.update((v) => [...v, this]);

      onCleanup(() => {
        this.#selectControl.itemControls.update((v) => v.filter((item) => item !== this));
      });
    });
  }

  @HostListener("click", ["$event"])
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;

    this.#selectControl.onItemControlClick(this, this.selectMode() === "single");
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, false);
    }
    if (!event.ctrlKey && !event.altKey && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      this.#selectControl.onItemControlClick(this, this.selectMode() === "single");
    }
  }
}
