import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  Output,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import * as SimpleMDE from "simplemde";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import * as codemirror from "codemirror";

@Component({
  selector: "sd-markdown-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea #textarea></textarea>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      border: 1px solid trans-color(default);

      /deep/ {
        .editor-toolbar {
          border: none;
          padding: 0;
          border-radius: 0;
          opacity: 1;
          border-bottom: 1px solid trans-color(default);

          &:before,
          &:after {
            display: none;
          }

          > a {
            color: text-color(default) !important;
            padding: gap(sm) gap(default);
            width: auto;
            height: auto;
            border: none;
            border-radius: 0;

            &:before {
              line-height: $line-height;
            }

            &.active,
            &:hover {
              color: text-color(dark) !important;
              background: trans-color(default);
            }
          }

          &.disabled-for-preview {
            > a:not(.no-disable) {
              color: text-color(lighter) !important;
              background: transparent;
            }
          }

          &.fullscreen {
            padding: 0;
            height: auto;
            z-index: $z-index-fullscreen;
          }
        }
        
        .CodeMirror {
          border: none;
          min-height: 150px;
          height: calc(100% - 28px);
          .CodeMirror-scroll {
            min-height: 150px;
          }

          &.CodeMirror-fullscreen {
            top: 27px;
            z-index: $z-index-fullscreen;
          }
        }
        
        /*.editor-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid trans-color(light);
          padding: 0;
          border-radius: 0;
          opacity: 1;

          &:hover {
            opacity: 1;
          }

          &:before,
          &:after {
            display: none;
          }

          > a {
            //color: text-color(dark) !important;
            padding: gap(sm) gap(default);
            width: auto;
            height: auto;
            border: none;
            border-radius: 0;

            &:before {
              line-height: $line-height;
            }

            &.active,
            &:hover {
              color: text-color(default) !important;
              background: trans-color(default);
            }
          }

          > .separator {
            border-left-color: text-color(darkest);
            border-right-color: text-color(darker);
          }

          &.disabled-for-preview {
            > a:not(.no-disable) {
              color: text-color(darkest) !important;
              background: transparent;
            }
          }

          &.fullscreen {
            background: theme-color(bluegrey, darkest);
            padding: 0;
            height: auto;
            z-index: $z-index-fullscreen;
          }
        }*/

        /*.CodeMirror {
          background: trans-color(default);
          color: text-color(default);
          border: none;
          border-radius: 0;
          background: $bg-color;
          min-height: 150px;
          height: calc(100% - 28px);
          .CodeMirror-scroll {
            min-height: 150px;
          }

          .CodeMirror-cursor {
            border-color: text-color(default);
          }

          .CodeMirror-selected {
            background: #0967d6;
          }

          .CodeMirror-code {
            pre {
              .cm-comment {
                background: transparent;
              }
            }
          }

          &.CodeMirror-fullscreen {
            top: 27px;
            z-index: $z-index-fullscreen;
          }
        }

        .editor-preview,
        .editor-preview-side {
          background: $bg-color;

          pre {
            background: trans-color(default);
            padding: gap(xs) gap(sm);
            border-radius: 2px;
          }

          ol {
            padding-left: 20px;
          }
        }

        .editor-preview-side {
          top: 27px;
          border-top: none;
          border-right: none;
          border-bottom: none;
          border-left-color: trans-color(default);
          z-index: $z-index-fullscreen;
        }

        .editor-statusbar {
          color: text-color(darker) !important;
          padding: gap(sm) gap(default);
          border-top: 1px solid trans-color(light);
        }*/
      }

      &[sd-disabled=true] {
        /deep/ {
          .editor-toolbar {
            display: none;
          }

          .CodeMirror {
            height: 100%;
          }
        }
      }
    }
  `]
})
export class SdMarkdownEditorControl implements AfterViewInit, ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate(String)
  @SdNotifyPropertyChange()
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-preview")
  public preview?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  public previewRender?: (plainText: string) => string | Promise<string>;

  @Output()
  public readonly dropFiles = new EventEmitter<ISdMarkdownEditorDropFilesEvent>();

  @ViewChild("textarea")
  public textareaElRef!: ElementRef<HTMLTextAreaElement>;

  private _mde!: SimpleMDE;

  public constructor(private readonly _zone: NgZone) {
  }

  public ngAfterViewInit(): void {
    const options: SimpleMDE.Options = {
      element: this.textareaElRef.nativeElement,
      spellChecker: false,
      status: false,
      initialValue: this.value
    };

    if (this.previewRender) {
      options.previewRender = (plainText, preview) => {
        const result = this.previewRender!(plainText);
        if (result instanceof Promise) {
          result
            .then(r => {
              preview!.innerHTML = SimpleMDE.prototype["markdown"](r);
            })
            .catch(err => {
              console.error(err);
              preview!.innerHTML = "Error! " + err.message;
            });
        }
        else {
          preview!.innerHTML = SimpleMDE.prototype["markdown"](result);
        }
        return "Loading...";
      };
    }

    this._mde = new SimpleMDE(options);

    if (this.preview) {
      SimpleMDE.togglePreview(this._mde);
    }

    this._mde.codemirror.on("change", () => {
      if (this.value === (this._mde.value() || undefined)) return;
      this._zone.run(() => {
        this.value = this._mde.value();
        this.valueChange.emit(this.value);
      });
    });

    this._mde.codemirror.dragDrop = true;
    this._mde.codemirror.on("drop", async (cm: codemirror.Editor, e: DragEvent) => {
      const files: File[] = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        e.stopPropagation();
        e.preventDefault();

        const position = cm.coordsChar({
          left: e.x,
          top: e.y
        });

        this.dropFiles.emit({position, files});
      }
    });

    this._mde.codemirror.on("paste", async (cm: codemirror.Editor, e: ClipboardEvent) => {
      if (e.clipboardData.items[0]) {
        const file = e.clipboardData.items[0].getAsFile();
        if (file) {
          this.dropFiles.emit({position: cm.getDoc().getCursor(), files: [file]});
        }
      }
    });
  }

  public async sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): Promise<void> {
    if (propertyName === "value" && this._mde) {
      if (newValue === (this._mde.value() || undefined)) return;

      this._mde.value(newValue || "");
      if (this._mde.isPreviewActive()) {
        SimpleMDE.togglePreview(this._mde);
        SimpleMDE.togglePreview(this._mde);
      }
    }
    else if (propertyName === "preview" && this._mde) {
      if (
        (newValue && !this._mde.isPreviewActive()) ||
        (!newValue && this._mde.isPreviewActive())
      ) {
        SimpleMDE.togglePreview(this._mde);
      }
    }
  }
}

export interface ISdMarkdownEditorDropFilesEvent {
  position: { line: number; ch: number };
  files: File[];
}