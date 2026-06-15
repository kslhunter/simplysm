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
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useTiptapToolbar } from "./useTiptapToolbar";

const DEFAULT_EXTENSIONS: AnyExtension[] = [
  StarterKit,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image.configure({ inline: false, allowBase64: true }),
  Underline,
];

@Component({
  selector: "sd-tiptap-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    @if (!disabled()) {
      <div class="_toolbar">
        <div class="_btn-group">
          <button type="button" data-cmd="h1" [class._active]="activeStates().h1"
                  (click)="execCmd('h1')">H1</button>
          <button type="button" data-cmd="h2" [class._active]="activeStates().h2"
                  (click)="execCmd('h2')">H2</button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="bold" [class._active]="activeStates().bold"
                  (click)="execCmd('bold')">B</button>
          <button type="button" data-cmd="italic" [class._active]="activeStates().italic"
                  (click)="execCmd('italic')">I</button>
          <button type="button" data-cmd="underline" [class._active]="activeStates().underline"
                  (click)="execCmd('underline')">U</button>
          <button type="button" data-cmd="strike" [class._active]="activeStates().strike"
                  (click)="execCmd('strike')">S</button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="textColor" class="_color-btn"
                  (click)="toggleColorPicker('text')">
            <span class="_color-indicator" [style.background-color]="activeColor()"></span>
            A
          </button>
          <button type="button" data-cmd="bgColor" class="_color-btn"
                  (click)="toggleColorPicker('bg')">
            <span class="_color-indicator" [style.background-color]="activeBgColor()"></span>
            BG
          </button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="bulletList" [class._active]="activeStates().bulletList"
                  (click)="execCmd('bulletList')">UL</button>
          <button type="button" data-cmd="orderedList" [class._active]="activeStates().orderedList"
                  (click)="execCmd('orderedList')">OL</button>
          <button type="button" data-cmd="indent" (click)="execCmd('indent')">→</button>
          <button type="button" data-cmd="outdent" (click)="execCmd('outdent')">←</button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="blockquote" [class._active]="activeStates().blockquote"
                  (click)="execCmd('blockquote')">❝</button>
          <button type="button" data-cmd="codeBlock" [class._active]="activeStates().codeBlock"
                  (click)="execCmd('codeBlock')">&lt;/&gt;</button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="alignLeft" [class._active]="activeStates().alignLeft"
                  (click)="execCmd('alignLeft')">≡L</button>
          <button type="button" data-cmd="alignCenter" [class._active]="activeStates().alignCenter"
                  (click)="execCmd('alignCenter')">≡C</button>
          <button type="button" data-cmd="alignRight" [class._active]="activeStates().alignRight"
                  (click)="execCmd('alignRight')">≡R</button>
          <button type="button" data-cmd="alignJustify" [class._active]="activeStates().alignJustify"
                  (click)="execCmd('alignJustify')">≡J</button>
        </div>
        <div class="_btn-group">
          <button type="button" data-cmd="clean" (click)="execCmd('clean')">Tx</button>
        </div>
      </div>
      @if (colorPickerMode() != undefined) {
        <div class="_color-picker">
          @for (color of colorPresets; track color) {
            <button type="button" class="_color-swatch"
                    [style.background-color]="color"
                    [attr.aria-label]="color"
                    (click)="applyColor(color)"></button>
          }
          <button type="button" class="_color-swatch _no-color"
                  (click)="applyColor(undefined)">✕</button>
        </div>
      }
    }
    <div class="_editor-container"></div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-tiptap-editor {
        display: block;
        position: relative;
        border: 1px solid var(--trans-lighter);
        border-radius: var(--border-radius-default);
        background: var(--theme-secondary-lightest);

        > ._toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--gap-xs);
          padding: var(--gap-xs);
          border-bottom: 1px solid var(--trans-lighter);

          > ._btn-group {
            display: flex;
            gap: 1px;

            > button {
              padding: var(--gap-xs) var(--gap-sm);
              border: 1px solid var(--trans-lighter);
              border-radius: var(--border-radius-default);
              background: transparent;
              cursor: pointer;
              font-size: var(--font-size-default);
              line-height: 1;

              &._active {
                background: var(--theme-primary-default);
                color: var(--text-trans-rev-default);
              }

              &:hover {
                background: var(--trans-lighter);
              }

              &._active:hover {
                background: var(--theme-primary-default);
              }
            }
          }
        }

        > ._color-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: var(--gap-xs);
          border-bottom: 1px solid var(--trans-lighter);

          > ._color-swatch {
            width: 1.25rem;
            height: 1.25rem;
            border: 1px solid var(--trans-lighter);
            border-radius: 2px;
            cursor: pointer;
            padding: 0;

            &._no-color {
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--control-color);
              font-size: 0.625rem;
            }
          }
        }

        > ._editor-container {
          padding: var(--gap-sm);
          min-height: 6.25rem;
          font-family: var(--font-family-field);

          > .tiptap {
            outline: none;

            &:focus {
              outline: none;
            }
          }
        }

        &[data-sd-disabled="true"] {
          background: var(--theme-gray-lightest);
          color: var(--text-trans-light);

          > ._editor-container > .tiptap {
            cursor: not-allowed;
          }
        }

        &[data-sd-readonly="true"] {
          > ._editor-container > .tiptap {
            cursor: default;
          }
        }

        ._color-btn {
          position: relative;

          > ._color-indicator {
            display: block;
            height: 2px;
            width: 100%;
            position: absolute;
            bottom: 2px;
            left: 0;
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
export class SdTiptapEditor {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  extensions = input<AnyExtension[]>();

  private readonly _elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);

  readonly colorPresets = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef",
    "#f3f3f3", "#ffffff", "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff",
    "#4a86e8", "#0000ff", "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc",
    "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc", "#dd7e6b", "#ea9999",
    "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  ];

  /** @internal -- TipTap Editor 인스턴스. 테스트 및 고급 사용자용 */
  editor: WritableSignal<Editor | undefined> = signal(undefined);

  private readonly _toolbar = useTiptapToolbar({ editor: this.editor });
  activeStates = this._toolbar.activeStates;
  activeColor = this._toolbar.activeColor;
  activeBgColor = this._toolbar.activeBgColor;
  colorPickerMode = this._toolbar.colorPickerMode;
  execCmd = this._toolbar.execCmd;
  toggleColorPicker = this._toolbar.toggleColorPicker;
  applyColor = this._toolbar.applyColor;

  private _lastEditorHtml: string | undefined;
  private _lastExtensions: AnyExtension[] | undefined;

  private readonly _resolvedExtensions = computed(() => {
    const custom = this.extensions();
    if (custom != null) return custom;

    const ph = this.placeholder();
    if (ph != null) {
      return [...DEFAULT_EXTENSIONS, Placeholder.configure({ placeholder: ph })];
    }
    return DEFAULT_EXTENSIONS;
  });

  constructor() {
    // Single effect that tracks both extensions and value
    effect(() => {
      const extensions = this._resolvedExtensions();
      const val = this.value();

      // Recreate editor if extensions changed
      if (this._lastExtensions !== extensions) {
        this._lastExtensions = extensions;
        this._destroyEditor();
        this._createEditor(extensions, val);
        return;
      }

      // Skip if value matches last editor output (editor-originated change)
      if (val === this._lastEditorHtml) return;

      // Sync value to existing editor
      const currentEditor = untracked(() => this.editor());
      if (currentEditor == null) return;
      const currentHtml = this._getEditorHtmlFrom(currentEditor);
      if (currentHtml === val) return;
      currentEditor.commands.setContent(val ?? "", { emitUpdate: false });
      this._lastEditorHtml = undefined;
    });

    // disabled/readonly → editor.setEditable()
    effect(() => {
      const ed = this.editor();
      if (ed == null) return;
      const editable = !this.disabled() && !this.readonly();
      ed.setEditable(editable);
    });

    // setupInvalid for form validation
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

  private _createEditor(extensions: AnyExtension[], initialContent: string | undefined): void {
    const container = this._elRef.nativeElement.querySelector("._editor-container");
    if (container == null) return;

    this.editor.set(new Editor({
      element: container,
      extensions,
      content: initialContent ?? "",
      editable: untracked(() => !this.disabled() && !this.readonly()),
      onUpdate: ({ editor }) => {
        const html = this._getEditorHtmlFrom(editor);
        this._lastEditorHtml = html;
        this.value.set(html);
      },
      onTransaction: () => {
        this._toolbar.refreshActiveStates();
      },
    }));
  }

  private _destroyEditor(): void {
    const ed = untracked(() => this.editor());
    if (ed != null) {
      ed.destroy();
      this.editor.set(undefined);
    }
    this._lastEditorHtml = undefined;
  }

  private _getEditorHtmlFrom(editor: Editor): string | undefined {
    const html = editor.getHTML();
    if (editor.isEmpty) return undefined;
    return html;
  }

}
