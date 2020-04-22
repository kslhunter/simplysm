import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from "@angular/core";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdInputValidate} from "../commons/SdInputValidate";
import * as marked from "marked";

@Component({
  selector: "sd-markdown-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock class="_toolbar" *ngIf="!disabled">
        <sd-anchor (click)="viewState = 'preview'" [class._selected]="viewState === 'preview'">
          <sd-icon [icon]="'eye'"></sd-icon>
        </sd-anchor>
        <sd-anchor (click)="viewState = 'edit'" [class._selected]="viewState === 'edit'">
          <sd-icon [icon]="'pen'"></sd-icon>
        </sd-anchor>
        <sd-anchor (click)="viewState = 'help'" [class._selected]="viewState === 'help'">
          <sd-icon [icon]="'question'"></sd-icon>
        </sd-anchor>
        <ng-container *ngIf="rowsButton && viewState === 'edit'">
          |
          <sd-anchor (click)="rows = rows + 1">
            <sd-icon [icon]="'plus'"></sd-icon>
          </sd-anchor>
          <sd-anchor (click)="rows = rows - 1" *ngIf="rows > 1">
            <sd-icon [icon]="'minus'"></sd-icon>
          </sd-anchor>
        </ng-container>
      </sd-dock>

      <sd-pane>
        <div class="_editor" *ngIf="viewState === 'edit' && !disabled">
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
        <div class="_preview" [hidden]="viewState !== 'preview' && !disabled">
          <sd-busy-container [busy]="busyCount > 0" [innerHTML]="innerHTML">
          </sd-busy-container>
        </div>
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
    @import "../../scss/mixins";

    :host {
      display: block;
      border: 1px solid var(--sd-border-color);

      /deep/ > sd-dock-container {
        > ._toolbar {
          user-select: none;
          border-bottom: 1px solid var(--sd-border-color);

          > sd-anchor {
            display: inline-block;
            padding: var(--gap-sm) 0;
            text-align: center;
            width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));

            &:hover {
              background: rgba(0, 0, 0, .05);
            }

            &._selected {
              background: var(--theme-color-primary-default);
              color: var(--text-brightness-rev-default);
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
            background: var(--theme-color-secondary-lightest);
            border: none;
            transition: outline-color .1s linear;
            outline: 1px solid transparent;
            outline-offset: -1px;
            white-space: nowrap;

            &::-webkit-input-placeholder {
              color: var(--text-brightness-lighter);
            }

            &:focus {
              outline-color: var(--theme-color-primary-default);
            }

            > ._invalid-indicator {
              display: none;
            }

            > input[sd-invalid=true] + ._invalid-indicator,
            > input:invalid + ._invalid-indicator {
              @include invalid-indicator();
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
            font-size: var(--font-size-h1);
            color: rgba(0, 0, 0, .3);
            text-align: center;
            padding-top: 20px;
          }
        }

        > sd-pane > ._preview {
          padding: var(--gap-sm);
          height: 100%;
          overflow: auto;
          background: white;

          ol {
            padding-left: 20px;
          }

          code {
            background: rgba(0, 0, 0, .05);
            border-radius: 2px;
          }

          pre {
            background: rgba(0, 0, 0, .05);
            padding: var(--gap-sm) var(--gap-default);
            border-radius: 2px;
            white-space: pre-wrap;

            > code {
              background: transparent;
            }
          }

          p {
            margin-top: var(--gap-sm);
            margin-bottom: var(--gap-sm);
          }
        }
      }

      &[sd-inset=true] {
        border: none !important;

        ///deep/ > sd-dock-container> ._toolbar {
        //  border-bottom: none !important;
        //}
      }

      &[sd-disabled=true] {
        /deep/ > sd-dock-container {
          > sd-pane > ._preview {
            height: auto;
          }
        }
      }

      &[sd-dragover=true] {
        /deep/ > sd-dock-container > sd-pane > ._editor > ._dragover {
          display: block;
        }
      }
    }

  `]
})
export class SdMarkdownEditorControl implements OnChanges {
  @Input()
  @SdInputValidate(String)
  public value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @Input()
  @SdInputValidate({type: String, includes: ["preview", "edit", "help"]})
  public viewState: "preview" | "edit" | "help" = "edit";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  public previewRenderFn?: (plainText: string) => string | Promise<string>;

  @Output()
  public readonly dropFiles = new EventEmitter<ISdMarkdownEditorDropFilesEvent>();

  public innerHTML?: SafeHtml;

  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-dragover")
  public dragover?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["both", "horizontal", "vertical", "none"]
  })
  public resize = "vertical";

  @Input()
  @SdInputValidate({type: Number, notnull: true})
  public rows = 3;

  @Input()
  @SdInputValidate({type: Boolean, notnull: true})
  public rowsButton = true;

  @Input()
  @SdInputValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-inset")
  public inset = false;

  public busyCount = 0;

  public constructor(private readonly _sanitizer: DomSanitizer,
                     private readonly _cdr: ChangeDetectorRef) {
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

  public onTextareaPaste(event: ClipboardEvent): void {
    if (!event.clipboardData) return;

    const files = Array.from(event.clipboardData.items)
      .filter(item => item.kind === "file")
      .map(item => item.getAsFile())
      .filterExists();

    if (files.length > 0) {
      const position = (event.target as HTMLTextAreaElement).selectionEnd;
      this.dropFiles.emit({position, files});
    }
  }

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (Object.keys(changes).length > 0) {
      if (this.value !== undefined) {
        if (this.previewRenderFn) {
          this.busyCount++;
          const value = await this.previewRenderFn(this.value);
          const html = marked(value);
          this.innerHTML = this._sanitizer.bypassSecurityTrustHtml(html);
          this.busyCount--;
          this._cdr.markForCheck();
        }
        else {
          const html = marked(this.value);
          this.innerHTML = this._sanitizer.bypassSecurityTrustHtml(html);
        }
      }
      else {
        this.innerHTML = "";
      }
    }
  }
}

export interface ISdMarkdownEditorDropFilesEvent {
  position: number;
  files: File[];
}
