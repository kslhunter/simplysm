import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { SdSelectControl } from "./sd-select.control";
import { SdCheckboxControl } from "../checkbox/sd-checkbox.control";
import { SdGapControl } from "../../layout/sd-gap.control";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl, SdGapControl],
  template: `
    <div class="_content" tabindex="0" (click)="onClick()" (keydown)="onKeydown($event)">
      @if (_parentControl.selectMode() === "multi") {
        <sd-checkbox [value]="isSelected()" [inline]="true" />
        <sd-gap [width]="'sm'" />
      }
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-select-item {
        display: block;

        > ._content {
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;

          &:hover {
            background: var(--trans-lighter);
          }

          &:focus {
            outline: none;
            background: var(--trans-lighter);
          }
        }

        &[data-sd-selected="true"] > ._content {
          background: var(--trans-lighter);
          font-weight: bold;
        }

        &[data-sd-disabled="true"] {
          > ._content {
            opacity: 0.3;
            cursor: default;
            pointer-events: none;
          }
        }

        &[data-sd-hidden="true"] {
          display: none;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-selected]": "isSelected()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-hidden]": "hidden()",
  },
})
export class SdSelectItemControl<T> {
  protected readonly _parentControl = inject<SdSelectControl<any, T>>(
    forwardRef(() => SdSelectControl),
  );
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _destroyRef = inject(DestroyRef);

  value = input.required<T>();
  disabled = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });

  contentHTML = signal("");

  isSelected = computed(() => {
    const parentValue = this._parentControl.value();
    const itemValue = this.value();
    if (this._parentControl.selectMode() === "multi") {
      const arr = parentValue as T[] | undefined;
      return arr != null && arr.includes(itemValue);
    }
    return parentValue === itemValue;
  });

  constructor() {
    afterNextRender(() => {
      const contentEl = this._elRef.nativeElement.querySelector("._content");
      if (contentEl == null) return;

      this.contentHTML.set(contentEl.innerHTML);

      const observer = new MutationObserver(() => {
        this.contentHTML.set(contentEl.innerHTML);
      });
      observer.observe(contentEl, { childList: true, characterData: true, subtree: true });

      this._destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  onClick(): void {
    if (this.disabled()) return;
    this._parentControl.selectItem(this.value());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (this.disabled()) return;
      // Space always toggles without closing
      this._parentControl.toggleItem(this.value());
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (this.disabled()) return;
      if (this._parentControl.selectMode() === "single") {
        this._parentControl.selectItem(this.value());
      } else {
        this._parentControl.toggleItem(this.value());
      }
    }
  }
}
