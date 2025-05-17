import {
  afterRender,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./sd-select-control";
import { SdCheckboxControl } from "./sd-checkbox.control";
import { SdGapControl } from "./sd-gap.control";
import { injectElementRef } from "../utils/injections/inject-element-ref";
import { setupRipple } from "../utils/setups/setup-ripple";
import { transformBoolean } from "../utils/type-tramsforms";
import { $computed } from "../utils/bindings/$computed";
import { $signal } from "../utils/bindings/$signal";
import { $effect } from "../utils/bindings/$effect";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, SdGapControl],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

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

        &[sd-hidden="true"] {
          display: none;
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
      <ng-content />
    </div>
  `,
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-select-mode]": "selectMode()",
    "[attr.sd-selected]": "isSelected()",
    "[attr.sd-hidden]": "hidden()",
  },
})
export class SdSelectItemControl {
  private _selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));

  elRef = injectElementRef<HTMLElement>();

  value = input<any>();
  disabled = input(false, { transform: transformBoolean });
  hidden = input(false, { transform: transformBoolean });

  selectMode = $computed(() => this._selectControl.selectMode());
  isSelected = $computed(() => this._selectControl.getIsSelectedItemControl(this));

  contentHTML = $signal<string>("");

  constructor() {
    setupRipple(() => !this.disabled());

    $effect((onCleanup) => {
      this._selectControl.itemControls.update((v) => [...v, this]);

      onCleanup(() => {
        this._selectControl.itemControls.update((v) => v.filter((item) => item !== this));
      });
    });

    afterRender(() => {
      const html = this.elRef.nativeElement.findFirst("> ._content")!.innerHTML;
      if (this.contentHTML() !== html.trim()) {
        this.contentHTML.set(html.trim());
      }
    });
  }

  @HostListener("click", ["$event"])
  onClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;

    this._selectControl.onItemControlClick(this, this.selectMode() === "single");
  }

  @HostListener("keydown", ["$event"])
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
