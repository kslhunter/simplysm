import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {coercionBoolean, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdEventsDirective} from "../directives/SdEventsDirective";

@Component({
  selector: "sd-content-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdEventsDirective
  ],
  template: `
    <div #editorEl
         class="_editor"
         [innerHTML]="value"
         (input)="onInput()"
         [attr.contenteditable]="!disabled && !readonly"
         [title]="value"
         [style]="editorStyle"
         (focus.outside)="onEditorFocusOutside()"></div>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      position: relative;

      > ._editor {
        @include form-control-base();
        white-space: pre-wrap;

        background: var(--theme-secondary-lightest);
        border: 1px solid var(--border-color-default);
        border-radius: var(--border-radius-default);

        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        &:focus {
          outline: none;
          border-color: var(--theme-primary-default);
        }
      }

      &[sd-disabled=true] {
        > ._editor {
          background: var(--theme-grey-lightest);
          color: var(--text-trans-light);
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
            color: var(--text-trans-default);
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
          outline: 1px solid var(--theme-primary-default);
          outline-offset: -1px;
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      &[sd-invalid=true] {
        > ._invalid-indicator {
          display: block;
          position: absolute;
          background: var(--theme-danger-default);

          top: var(--gap-xs);
          left: var(--gap-xs);
          border-radius: 100%;
          width: var(--gap-sm);
          height: var(--gap-sm);
        }
      }
    }
  `]
})
export class SdContentEditorControl implements DoCheck {
  @Input()
  value?: string;

  @Output()
  valueChange = new EventEmitter<string | undefined>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-readonly")
  readonly = false;

  @Input({transform: coercionBoolean})
  required = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input()
  editorStyle?: string;

  @Input()
  validatorFn?: TSdFnInfo<(value: string | undefined) => boolean>;

  @ViewChild("editorEl", {static: true})
  editorElRef!: ElementRef<HTMLDivElement>;

  @HostBinding("attr.sd-invalid")
  isInvalid = false;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        value: [this.value],
        required: [this.required],
        ...getSdFnCheckData("validatorFn", this.validatorFn)
      }, () => {
        if (this.value == null && this.required) {
          this.isInvalid = true;
        }
        else if (this.validatorFn?.[0]) {
          this.isInvalid = !this.validatorFn[0](this.value);
        }
        else {
          this.isInvalid = false;
        }
      });
    });
  }

  onEditorFocusOutside() {
    if (!this.readonly) {
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNodeContents(this.editorElRef!.nativeElement);

      selection.setPosition(this.editorElRef!.nativeElement, range.endOffset);
    }
  }

  onInput() {
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
