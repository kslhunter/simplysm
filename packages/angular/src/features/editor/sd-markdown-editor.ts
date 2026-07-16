import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  untracked,
  ViewEncapsulation,
  type WritableSignal,
} from "@angular/core";
import { setupInvalid } from "../../core/validation/setupInvalid";
import { Editor, type AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useTiptapToolbar, type TiptapCommand } from "./useTiptapToolbar";

const DEFAULT_EXTENSIONS: AnyExtension[] = [StarterKit, Markdown];

@Component({
  selector: "sd-markdown-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    @if (!disabled() && !readonly()) {
      <div class="_toolbar">
        <div class="_btn-group">
          <button
            type="button"
            data-cmd="h1"
            [class._active]="activeStates().h1"
            (click)="execCmd('h1')"
          >
            H1
          </button>
          <button
            type="button"
            data-cmd="h2"
            [class._active]="activeStates().h2"
            (click)="execCmd('h2')"
          >
            H2
          </button>
        </div>
        <div class="_btn-group">
          <button
            type="button"
            data-cmd="bold"
            [class._active]="activeStates().bold"
            (click)="execCmd('bold')"
          >
            B
          </button>
          <button
            type="button"
            data-cmd="italic"
            [class._active]="activeStates().italic"
            (click)="execCmd('italic')"
          >
            I
          </button>
          <button
            type="button"
            data-cmd="strike"
            [class._active]="activeStates().strike"
            (click)="execCmd('strike')"
          >
            S
          </button>
        </div>
        <div class="_btn-group">
          <button
            type="button"
            data-cmd="bulletList"
            [class._active]="activeStates().bulletList"
            (click)="execCmd('bulletList')"
          >
            UL
          </button>
          <button
            type="button"
            data-cmd="orderedList"
            [class._active]="activeStates().orderedList"
            (click)="execCmd('orderedList')"
          >
            OL
          </button>
          <button type="button" data-cmd="indent" (click)="execCmd('indent')">→</button>
          <button type="button" data-cmd="outdent" (click)="execCmd('outdent')">←</button>
        </div>
        <div class="_btn-group">
          <button
            type="button"
            data-cmd="blockquote"
            [class._active]="activeStates().blockquote"
            (click)="execCmd('blockquote')"
          >
            ❝
          </button>
          <button
            type="button"
            data-cmd="codeBlock"
            [class._active]="activeStates().codeBlock"
            (click)="execCmd('codeBlock')"
          >
            &lt;/&gt;
          </button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="clean" (click)="execCmd('clean')">Tx</button>
        </div>
      </div>
    }
    <div class="_editor-container"></div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-markdown-editor {
        display: block;
        position: relative;
        border: 1px solid var(--sd-bd-field);
        border-radius: var(--sd-radius-default);
        background-color: var(--sd-bg-field);

        > ._toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--sd-gap-xs);
          padding: var(--sd-gap-xs);
          border-bottom: 1px solid var(--sd-bd-hairline);

          > ._btn-group {
            display: flex;
            gap: 1px;

            > button {
              padding: var(--sd-gap-xs) var(--sd-gap-sm);
              border: 1px solid var(--sd-bd-hairline);
              border-radius: var(--sd-radius-default);
              background-color: transparent;
              cursor: pointer;
              font-size: var(--sd-font-size-default);
              line-height: 1;

              &._active {
                background-color: var(--sd-bg-primary-solid);
                color: var(--sd-tx-primary-solid);
              }

              &:hover {
                background-color: var(--sd-bg-state-hover);
              }

              &._active:hover {
                background-color: var(--sd-bg-primary-solid);
              }
            }
          }
        }

        > ._editor-container {
          padding: var(--sd-gap-sm);
          min-height: 6.25rem;
          font-family: var(--sd-font-family-field);

          > .tiptap {
            outline: none;

            &:focus {
              outline: none;
            }
          }
        }

        // disabled 는 색 치환 단일 규약 (DEC-009)
        &[data-sd-disabled="true"] {
          background-color: var(--sd-bg-disabled);
          color: var(--sd-tx-disabled);

          > ._editor-container > .tiptap {
            cursor: not-allowed;
          }
        }

        &[data-sd-readonly="true"] {
          > ._editor-container > .tiptap {
            cursor: default;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-readonly]": "readonly()",
  },
})
export class SdMarkdownEditor {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  validatorFn = input<(value: string | undefined) => string | undefined>();

  private readonly _elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);

  /** @internal -- TipTap Editor 인스턴스. 테스트 및 고급 사용자용 */
  editor: WritableSignal<Editor | undefined> = signal(undefined);

  private readonly _toolbar = useTiptapToolbar({ editor: this.editor });
  activeStates = this._toolbar.activeStates;

  private _lastEditorMarkdown: string | undefined;
  private _lastExtensions: AnyExtension[] | undefined;

  private readonly _resolvedExtensions = computed(() => {
    const ph = this.placeholder();
    if (ph != null) {
      return [...DEFAULT_EXTENSIONS, Placeholder.configure({ placeholder: ph })];
    }
    return DEFAULT_EXTENSIONS;
  });

  constructor() {
    effect(() => {
      const extensions = this._resolvedExtensions();
      const value = this.value();
      const val = value === "" ? undefined : value;
      if (value === "") {
        untracked(() => this.value.set(undefined));
      }

      if (this._lastExtensions !== extensions) {
        this._lastExtensions = extensions;
        this._destroyEditor();
        this._createEditor(extensions, val);
        return;
      }

      if (val === this._lastEditorMarkdown) return;

      const currentEditor = untracked(() => this.editor());
      if (currentEditor == null) return;
      const currentMarkdown = this._getEditorMarkdownFrom(currentEditor);
      if (currentMarkdown === val) return;
      currentEditor.commands.setContent(val ?? "", { contentType: "markdown", emitUpdate: false });
      this._lastEditorMarkdown = undefined;
    });

    effect(() => {
      const ed = this.editor();
      if (ed == null) return;
      const editable = !this.disabled() && !this.readonly();
      ed.setEditable(editable);
    });

    setupInvalid(() => {
      const errorMessages: string[] = [];
      if (this.value() == null) {
        if (this.required()) {
          errorMessages.push("값을 입력하세요.");
        }
      }

      const validatorFn = this.validatorFn();
      if (validatorFn != null) {
        const message = validatorFn(this.value());
        if (message != null) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });

    this._destroyRef.onDestroy(() => {
      this._destroyEditor();
    });
  }

  execCmd(cmd: TiptapCommand): void {
    if (this.disabled() || this.readonly()) return;
    this._toolbar.execCmd(cmd);
  }

  private _createEditor(extensions: AnyExtension[], initialContent: string | undefined): void {
    const container = this._elRef.nativeElement.querySelector("._editor-container");
    if (container == null) return;

    this.editor.set(
      new Editor({
        element: container,
        extensions,
        content: initialContent ?? "",
        contentType: "markdown",
        editable: untracked(() => !this.disabled() && !this.readonly()),
        onUpdate: ({ editor }) => {
          const markdown = this._getEditorMarkdownFrom(editor);
          this._lastEditorMarkdown = markdown;
          this.value.set(markdown);
        },
        onTransaction: () => {
          this._toolbar.refreshActiveStates();
        },
      }),
    );
  }

  private _destroyEditor(): void {
    const ed = untracked(() => this.editor());
    if (ed != null) {
      ed.destroy();
      this.editor.set(undefined);
    }
    this._lastEditorMarkdown = undefined;
  }

  private _getEditorMarkdownFrom(editor: Editor): string | undefined {
    if (editor.isEmpty) return undefined;
    return editor.getMarkdown();
  }
}
