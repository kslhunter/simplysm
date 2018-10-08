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
        <a (click)="viewState = 'preview'" [class._selected]="viewState === 'preview'">
          <sd-icon [icon]="'eye'"></sd-icon>
        </a>
        <a (click)="viewState = 'edit'" [class._selected]="viewState === 'edit'">
          <sd-icon [icon]="'pen'"></sd-icon>
        </a>
        <a (click)="viewState = 'help'" [class._selected]="viewState === 'help'">
          <sd-icon [icon]="'question'"></sd-icon>
        </a>
        <ng-container *ngIf="rowsButton && viewState === 'edit'">
          |
          <a (click)="rows = rows + 1">
            <sd-icon [icon]="'plus'"></sd-icon>
          </a>
          <a (click)="rows = rows - 1" *ngIf="rows > 1">
            <sd-icon [icon]="'minus'"></sd-icon>
          </a>
        </ng-container>
      </sd-dock>

      <sd-pane>
        <div class="_editor"
             *ngIf="viewState === 'edit' && !disabled">
        <textarea [value]="value || ''"
                  [rows]="rows"
                  (input)="onTextareaInput($event)"
                  (dragover)="onTextareaDragover($event)"
                  (dragleave)="onTextareaDragLeave($event)"
                  (drop)="onTextareaDrop($event)"
                  (paste)="onTextareaPaste($event)"
                  [style.resize]="resize"></textarea>
          <div class="_dragover" *ngIf="viewState === 'edit' && !disabled">파일을 내려놓으세요.</div>
        </div>
        <div class="_preview" [innerHTML]="innerHTML" *ngIf="viewState === 'preview' || disabled"></div>
        <div *ngIf="viewState === 'help'" class="_help sd-padding-default">
          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">강조</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              <div style="font-weight: bold">**굵게**</div>
              <div style="font-style: italic;">*기울임*</div>
              <div style="text-decoration: line-through;">~~취소선~~</div>
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">헤더</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              <h1># 헤더 1</h1>
              <h2>## 헤더 2</h2>
              <h3>### 헤더 3</h3>
              <h4>#### 헤더 4</h4>
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">목록</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              <div>* 일반목록 항목</div>
              <div>* 일반목록 항목</div>
              <br/>
              <div>1. 순번목록 항목</div>
              <div>2. 순번목록 항목</div>
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">링크</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              [보여줄텍스트](http://www.example.com)
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">참조</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              > 참조입니다.<br/>
              > 여러줄을 적을 수 있습니다.
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">이미지</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              ![이미지타이틀](http://www.example.com/image.jpg)
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">표</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              | 컬럼 1 | 컬럼 2 | 컬럼 3 |<br/>
              | - | - | - |<br/>
              | 홍 | 길동 | 남성 |<br/>
              | 김 | 영희 | 여성 |
            </div>
          </div>

          <div class="sd-margin-bottom-default">
            <h4 class="sd-margin-bottom-xs">코드</h4>
            <div class="sd-padding-default sd-background-grey-lightest"
                 style="border-radius: 2px;">
              \`var example = "hello!";\`<br/>
              <br/>
              여러줄일 경우, 아래와 같이...<br/>
              <br/>
              \`\`\`<br/>
              var example = "hello!";<br/>
              alert(example);<br/>
              \`\`\`
            </div>
          </div>
        </div>
        <div class="_invalid-indicator"></div>
      </sd-pane>
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

        > sd-pane > ._editor {
          position: relative;
          width: 100%;
          height: 100%;

          > textarea {
            @include form-control-base();
            height: 100%;
            background: theme-color(info, lightest);
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

        > sd-pane > ._preview {
          /*border: 1px solid trans-color(default);*/
          padding: gap(sm);
          height: 100%;
          overflow: auto;
          //background: theme-color(grey, lightest);
          background: white;

          /deep/ {
            ol {
              padding-left: 20px;
            }

            code {
              background: rgba(0, 0, 0, .05);
              border-radius: 2px;
            }

            pre {
              background: rgba(0, 0, 0, .05);
              padding: gap(sm) gap(default);
              border-radius: 2px;
              white-space: pre-wrap;

              > code {
                background: transparent;
              }
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
          > sd-pane > ._preview {
            height: auto;
          }
        }
      }

      &[sd-dragover=true] {
        > sd-dock-container > sd-pane > ._editor > ._dragover {
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
  @SdTypeValidate({type: String, validator: value => ["preview", "edit", "help"].includes(value)})
  @SdNotifyPropertyChange()
  public viewState: "preview" | "edit" | "help" = "edit";

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
    if (["value", "previewRender", "viewState", "disabled"].includes(propertyName)) {
      if (this.value && (this.viewState === "preview" || this.disabled)) {
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