import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./sd-select.control";
import { SdCheckboxControl } from "../choice/sd-checkbox.control";
import { SdGapControl } from "../../layout/sd-gap.control";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";
import { setupRipple } from "../../../core/utils/setups/setupRipple";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";
import { $signal } from "../../../core/utils/bindings/$signal";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, SdGapControl],
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-select-mode]": "selectMode()",
    "[attr.data-sd-selected]": "isSelected()",
    "[attr.data-sd-hidden]": "hidden()",
    "(click)": "onClick($event)",
    "(keydown)": "onKeydown($event)",
  },
  template: `
    @if (selectMode() === "multi") {
      <sd-checkbox [value]="isSelected()" [inline]="true"></sd-checkbox>
      <sd-gap [width]="'sm'" />
    }

    <div class="_content" style="display: inline-block;">
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-select-item {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        transition: background 0.1s ease-in;
        background: var(--control-color);

        &:hover {
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &:focus {
          outline: none;
          transition: background 0.1s ease-out;
          background: rgba(0, 0, 0, 0.07);
        }

        &[data-sd-selected="true"] {
          color: var(--theme-primary-default);
          font-weight: bold;
          //background: var(--theme-primary-lightest);
          background: rgba(0, 0, 0, 0.07);
        }

        &[data-sd-disabled="true"] {
          background: var(--theme-gray-default);
          opacity: 0.3;
        }

        &[data-sd-hidden="true"] {
          display: none;
        }
      }
    `,
  ],
})
export class SdSelectItemControl {
  private readonly _selectControl: SdSelectControl<any, any> = inject(
    forwardRef(() => SdSelectControl),
  );

  elRef = injectElementRef<HTMLElement>();

  value = input<any>();
  disabled = input(false, { transform: transformBoolean });
  hidden = input(false, { transform: transformBoolean });

  selectMode = $computed(() => this._selectControl.selectMode());
  isSelected = $computed(() => this._selectControl.getIsSelectedItemControl(this));

  contentHTML = $signal<string>("");

  constructor() {
    setupRipple(() => !this.disabled());

    /*$effect([], (onCleanup) => {
      this.#selectControl.itemControls.update((v) => [...v, this]);

      onCleanup(() => {
        this.#selectControl.itemControls.update((v) => v.filter((item) => item !== this));
      });
    });*/

    afterEveryRender(() => {
      const html = this.elRef.nativeElement.findFirst("> ._content")!.innerHTML;
      if (this.contentHTML() !== html.trim()) {
        this.contentHTML.set(html.trim());
      }
    });
  }

  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;

    this._selectControl.onItemControlClick(this, this.selectMode() === "single");
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (!event.ctrlKey && !event.altKey && event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      this._selectControl.onItemControlClick(this, false);
    }
    if (!event.ctrlKey && !event.altKey && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      this._selectControl.onItemControlClick(this, this.selectMode() === "single");
    }
  }
}
