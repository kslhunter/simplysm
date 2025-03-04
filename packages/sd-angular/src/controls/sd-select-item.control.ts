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
import { $computed, $effect, $signal } from "../utils/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";
import { useRipple } from "../utils/use-ripple";
import { transformBoolean } from "../utils/type-tramsforms";

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
  #selectControl: SdSelectControl<any, any> = inject(forwardRef(() => SdSelectControl));
  elRef = injectElementRef<HTMLElement>();

  value = input<any>();
  disabled = input(false, { transform: transformBoolean });
  hidden = input(false, { transform: transformBoolean });

  selectMode = $computed(() => this.#selectControl.selectMode());
  isSelected = $computed(() => this.#selectControl.getIsSelectedItemControl(this));

  contentHTML = $signal<string>("");

  constructor() {
    useRipple(() => !this.disabled());

    $effect((onCleanup) => {
      this.#selectControl.itemControls.update((v) => [...v, this]);

      onCleanup(() => {
        this.#selectControl.itemControls.update((v) => v.filter((item) => item !== this));
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
