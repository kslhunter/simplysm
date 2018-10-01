import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import * as marked from "marked";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";

@Component({
  selector: "sd-markdown-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock class="_toolbar" *ngIf="!disabled">
        <a (click)="preview = true" [class._selected]="preview === true">
          <sd-icon [icon]="'eye'"></sd-icon>
        </a>
        <a (click)="preview = false" [class._selected]="preview !== true">
          <sd-icon [icon]="'pen'"></sd-icon>
        </a>
        <ng-container *ngIf="rowsButton && preview !== true">
          |
          <a (click)="rows = rows + 1">
            <sd-icon [icon]="'plus'"></sd-icon>
          </a>
          <a (click)="rows = rows - 1" *ngIf="rows > 1">
            <sd-icon [icon]="'minus'"></sd-icon>
          </a>
        </ng-container>
      </sd-dock>

      <div class="_editor"
           *ngIf="!preview && !disabled">
        <textarea [value]="value || ''"
                  [rows]="rows"
                  (input)="onTextareaInput($event)"
                  (dragover)="onTextareaDragover($event)"
                  (dragleave)="onTextareaDragLeave($event)"
                  (drop)="onTextareaDrop($event)"
                  (paste)="onTextareaPaste($event)"
                  [style.resize]="resize"></textarea>
        <div class="_dragover" *ngIf="!preview && !disabled">파일을 내려놓으세요.</div>
      </div>
      <div class="_preview" [innerHTML]="innerHTML" *ngIf="preview || disabled"></div>
      <div class="_invalid-indicator"></div>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      border: 1px solid trans-color(default);

      > sd-dock-container {
        > ._toolbar {
          user-select: none;

          > a {
            display: inline-block;
            padding: gap(sm) 0;
            text-align: center;
            width: gap(sm) * 2 + strip-unit($line-height) * font-size(default);

            &:hover {
              background: rgba(0, 0, 0, .05);
            }

            &._selected {
              background: theme-color(primary, default);
              color: text-color(reverse, default);
            }
          }
        }

        > ._editor {
          position: relative;
          width: 100%;
          height: 100%;

          > textarea {
            @include form-control-base();
            height: 100%;
            background: white;
            border: none;
            transition: outline-color .1s linear;
            outline: 1px solid transparent;
            outline-offset: -1px;

            &::-webkit-input-placeholder {
              color: text-color(lighter);
            }

            &:focus {
              outline-color: theme-color(primary, default);
            }

            > ._invalid-indicator {
              display: none;
            }

            > input[sd-invalid=true] + ._invalid-indicator,
            > input:invalid + ._invalid-indicator {
              display: block;
              position: absolute;
              top: 2px;
              left: 2px;
              border-radius: 100%;
              width: 4px;
              height: 4px;
              background: get($theme-color, danger, default);
            }
          }

          > ._dragover {
            display: none;
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, .05);
            font-size: font-size(h1);
            color: rgba(0, 0, 0, .3);
            text-align: center;
            padding-top: 20px;
          }
        }

        > ._preview {
          /*border: 1px solid trans-color(default);*/
          padding: gap(sm);
          height: 100%;
          overflow: auto;
          background: theme-color(grey, lightest);

          /deep/ {
            ol {
              padding-left: 20px;
            }

            pre {
              background: rgba(0, 0, 0, .05);
              padding: gap(sm) gap(default);
              border-radius: 2px;
              white-space: normal;
            }

            p {
              margin-top: gap(sm);
              margin-bottom: gap(sm);
            }
          }
        }
      }

      &[sd-disabled=true] {
        > sd-dock-container {
          > ._preview {
            height: auto;
          }
        }
      }

      &[sd-dragover=true] {
        > sd-dock-container > ._editor > ._dragover {
          display: block;
        }
      }
    }
  `]
})
export class SdMarkdownEditorControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate(String)
  @SdNotifyPropertyChange()
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @Input()
  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  public preview?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  @SdNotifyPropertyChange()
  public disabled?: boolean;

  @Input()
  @SdNotifyPropertyChange()
  public previewRender?: (plainText: string) => string | Promise<string>;

  @Output()
  public readonly dropFiles = new EventEmitter<ISdMarkdownEditorDropFilesEvent>();

  public innerHTML?: SafeHtml;

  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-dragover")
  public dragover?: boolean;


  @Input()
  @SdTypeValidate({
    type: String,
    notnull: true,
    validator: value => ["both", "horizontal", "vertical", "none"].includes(value)
  })
  public resize = "vertical";

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public rows = 3;


  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  public rowsButton = true;

  public constructor(private readonly _sanitizer: DomSanitizer,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public async sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): Promise<void> {
    if (["value", "previewRender", "preview", "disabled"].includes(propertyName)) {
      if (this.value && (this.preview || this.disabled)) {
        const value = this.previewRender ? await this.previewRender(this.value) : this.value;
        const html = marked(value);
        this.innerHTML = this._sanitizer.bypassSecurityTrustHtml(html);
        if (this.previewRender) {
          this._cdr.markForCheck();
        }
      }
      else {
        this.innerHTML = "";
      }
    }
  }

  public onTextareaInput(event: Event): void {
    const textareaEl = event.target as HTMLTextAreaElement;
    this.value = textareaEl.value;
    this.valueChange.emit(textareaEl.value);
  }

  public onTextareaDragover(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.dragover = true;
  }

  public onTextareaDragLeave(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.dragover = false;
  }

  public onTextareaDrop(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const files = Array.from(event.dataTransfer!.files);
    const position = (event.target as HTMLTextAreaElement).selectionEnd;
    this.dropFiles.emit({position, files});
    this.dragover = false;
  }

  public async onTextareaPaste(event: ClipboardEvent): Promise<void> {
    const files = Array.from(event.clipboardData.items)
      .filter(item => item.kind === "file")
      .map(item => item.getAsFile())
      .filterExists();

    if (files.length > 0) {
      const position = (event.target as HTMLTextAreaElement).selectionEnd;
      this.dropFiles.emit({position, files});
    }
  }
}

export interface ISdMarkdownEditorDropFilesEvent {
  position: number;
  files: File[];
}