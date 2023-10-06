import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { DateOnly, DateTime, Time } from "@simplysm/sd-core-common";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-content-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #editor
         class="_editor"
         [innerHTML]="controlValue"
         (input)="onInput()"
         [attr.contenteditable]="!disabled && !readonly"
         [title]="controlValue"
         [attr.style]="editorStyle"
         (focus)="onEditorFocus()"></div>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      position: relative;

      > ._editor {
        @include form-control-base();
        white-space: pre-wrap;

        background: var(--theme-color-secondary-lightest);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-default);

        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        &:focus {
          outline: none;
          border-color: var(--theme-color-primary-default);
        }
      }

      &[sd-disabled=true] {
        > ._editor {
          background: var(--theme-color-grey-lightest);
          color: var(--text-brightness-light);
        }
      }

      &[sd-size=sm] {
        > ._editor {
          padding: var(--gap-xs) var(--gap-sm);
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }
      }

      &[sd-size=lg] {
        > ._editor {
          padding: var(--gap-default) var(--gap-lg);
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }
      }

      &[sd-inline=true] {
        display: inline-block;

        > ._editor {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }
      }

      &[sd-inset=true] {
        > ._editor {
          border: none;
          border-radius: 0;
        }

        &[sd-disabled=true] {
          > ._editor {
            background: white !important;
            color: var(--text-brightness-default);
          }
        }

        > ._editor {
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] {
          > ._editor {
            min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        &[sd-size=lg] {
          > ._editor {
            min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        > ._editor:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      &[sd-invalid=true] {
        > ._invalid-indicator {
          @include invalid-indicator();
        }
      }
    }
  `]
})
export class SdContentEditorControl implements OnChanges {
  @Input()
  @SdInputValidate([Number, String, DateOnly, DateTime, Time])
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-readonly")
  public readonly?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({ type: String, includes: ["sm", "lg"] })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input("editor.style")
  @SdInputValidate(String)
  public editorStyle?: string;

  @Input()
  @SdInputValidate(Function)
  public validatorFn?: (value: string | undefined) => boolean;

  @ViewChild("editor")
  public editorElRef?: ElementRef<HTMLDivElement>;

  public controlValue?: string;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    if (this.value == null && this.required) {
      return true;
    }

    if (this.validatorFn) {
      return !this.validatorFn(this.value);
    }

    return false;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ("value" in changes) {
      const editorEl = this.editorElRef?.nativeElement;
      if (this.value !== editorEl?.innerHTML) {
        this.controlValue = this.value;
      }
    }
  }

  public onEditorFocus(): void {
    if (this.readonly === false) {
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNodeContents(this.editorElRef!.nativeElement);

      selection.setPosition(this.editorElRef!.nativeElement, range.endOffset);
    }
  }

  public onInput(): void {
    const editorEl = this.editorElRef!.nativeElement;

    let value: string | undefined;
    if (editorEl.innerHTML === "") {
      value = undefined;
    }
    else {
      value = editorEl.innerHTML;
    }

    if (this.value !== value) {
      if (this.valueChange.observed) {
        this.valueChange.emit(value);
      }
      else {
        this.value = value;
      }
    }
  }
}
