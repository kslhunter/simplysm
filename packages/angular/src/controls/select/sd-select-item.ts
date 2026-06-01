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
import { SdSelect } from "./sd-select";
import { SdCheckbox } from "../checkbox/sd-checkbox";
import { SdGap } from "../gap/sd-gap";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckbox, SdGap],
  template: `
    @if (_parentControl.selectMode() === "multi") {
      <sd-checkbox [value]="isSelected()" [inline]="true" />
      <sd-gap [width]="'sm'" />
    }

    <div class="_content" style="display: inline-block;">
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

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
          background: rgba(0, 0, 0, 0.07);
        }

        &[data-sd-disabled="true"] {
          background: var(--theme-gray-default);
          opacity: 0.3;
          cursor: default;
          pointer-events: none;
        }

        &[data-sd-hidden="true"] {
          display: none;
        }
      }
    `,
  ],
  host: {
    "[attr.tabindex]": "'0'",
    "[attr.data-sd-select-mode]": "_parentControl.selectMode()",
    "[attr.data-sd-selected]": "isSelected()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-hidden]": "hidden()",
    "(click)": "onClick($event)",
    "(keydown)": "onKeydown($event)",
  },
})
export class SdSelectItem<T> {
  protected readonly _parentControl = inject<SdSelect<any, T>>(
    forwardRef(() => SdSelect),
  );
  private readonly _elRef = inject(ElementRef<HTMLElement>);
  private readonly _destroyRef = inject(DestroyRef);

  value = input<T | undefined>(undefined);
  disabled = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });

  contentHTML = signal("");

  isSelected = computed(() => {
    const parentValue = this._parentControl.value();
    const itemValue = this.value();
    if (this._parentControl.selectMode() === "multi") {
      const arr = parentValue as T[] | undefined;
      return arr != null && arr.some((x) => x === itemValue);
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

  onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
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
