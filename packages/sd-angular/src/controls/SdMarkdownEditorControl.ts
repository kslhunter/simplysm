import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output,
} from "@angular/core";
import * as marked1 from "marked";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdIconControl} from "./SdIconControl";
import {faEye, faPen, faQuestion} from "@fortawesome/pro-duotone-svg-icons";
import {coercionBoolean, coercionNonNullableNumber, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {NgIf} from "@angular/common";

@Component({
  selector: "sd-markdown-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SdAnchorControl, SdBusyContainerControl, SdIconControl, NgIf],
  template: `
    <div class="_toolbar" *ngIf="!disabled">
      <sd-anchor (click)="viewState = 'preview'" [class._selected]="viewState === 'preview'">
        <sd-icon [icon]="faEye"/>
      </sd-anchor>
      <sd-anchor (click)="viewState = 'edit'" [class._selected]="viewState === 'edit'">
        <sd-icon [icon]="faPen"/>
      </sd-anchor>
      <sd-anchor (click)="viewState = 'help'" [class._selected]="viewState === 'help'">
        <sd-icon [icon]="faQuestion"/>
      </sd-anchor>
    </div>

    <div class="_editor" *ngIf="viewState === 'edit' && !disabled">
        <textarea [value]="value || ''"
                  [rows]="rows"
                  (input)="onTextareaInput($event)"
                  (dragover)="onTextareaDragover($event)"
                  (dragleave)="onTextareaDragLeave($event)"
                  (drop)="onTextareaDrop($event)"
                  (paste)="onTextareaPaste($event)"
                  [style.resize]="resize"
                  [attr.placeholder]="placeholder"
                  wrap="off"></textarea>
      <div class="_dragover" *ngIf="viewState === 'edit' && !disabled">파일을 내려놓으세요.</div>
    </div>
    <div class="_preview" [hidden]="viewState !== 'preview' && !disabled">
      <sd-busy-container [busy]="busyCount > 0" [innerHTML]="innerHTML" type="bar">
      </sd-busy-container>
    </div>
    <div *ngIf="viewState === 'help'" class="_help p-default">
      <div class="mb-default">
        <h4 class="mb-xs">강조</h4>
        <div class="p-default bg-grey-lightest bd-radius-default">
          <div style="font-weight: bold">**굵게**</div>
          <div style="font-style: italic;">*기울임*</div>
          <div style="text-decoration: line-through;">~~취소선~~</div>
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">헤더</h4>
        <div class="p-default bg-grey-lightest bd-radius-default">
          <h1># 헤더 1</h1>
          <h2>## 헤더 2</h2>
          <h3>### 헤더 3</h3>
          <h4>#### 헤더 4</h4>
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">목록</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
          <div>* 일반목록 항목</div>
          <div>* 일반목록 항목</div>
          <br/>
          <div>1. 순번목록 항목</div>
          <div>2. 순번목록 항목</div>
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">링크</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
          [보여줄텍스트](http://www.example.com)
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">참조</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
          > 참조입니다.<br/>
          > 여러줄을 적을 수 있습니다.
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">이미지</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
          ![이미지타이틀](http://www.example.com/image.jpg)
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">표</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
          | 컬럼 1 | 컬럼 2 | 컬럼 3 |<br/>
          | - | - | - |<br/>
          | 홍 | 길동 | 남성 |<br/>
          | 김 | 영희 | 여성 |
        </div>
      </div>

      <div class="mb-default">
        <h4 class="mb-xs">코드</h4>
        <div class="p-default bg-theme-grey-lightest bd-radius-default">
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
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      position: relative;

      > ._toolbar {
        display: block;
        border: 1px solid var(--border-color-default);
        border-bottom: none;
        text-align: right;

        > sd-anchor {
          display: inline-block;
          padding: var(--gap-sm) var(--gap-default);
          text-align: center;

          &._selected {
            display: none;
          }
        }
      }

      > ._editor {
        position: relative;
        width: 100%;
        height: 100%;
        border: 1px solid var(--border-color-default);

        > textarea {
          @include form-control-base();
          height: 100%;
          background: var(--theme-secondary-lightest);
          border: none;
          transition: outline-color .1s linear;
          outline: 1px solid transparent;
          outline-offset: -1px;
          white-space: nowrap;

          &::-webkit-input-placeholder {
            color: var(--text-trans-lighter);
          }

          &:focus {
            outline-color: var(--theme-primary-default);
          }

          > ._invalid-indicator {
            display: none;
          }

          > input[sd-invalid=true] + ._invalid-indicator,
          > input:invalid + ._invalid-indicator {
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

      > ._preview {
        padding: var(--gap-sm);
        height: 100%;
        overflow: auto;
        background: white;
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) + 2px);
        border: 1px solid var(--border-color-default);

        ::ng-deep {
          ol, ul {
            margin-top: 0;
            padding-left: 20px;
          }

          code {
            background: rgba(0, 0, 0, .05);
            border-radius: var(--border-radius-default);
          }

          pre {
            background: rgba(0, 0, 0, .05);
            padding: var(--gap-sm) var(--gap-default);
            border-radius: var(--border-radius-default);
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

      > ._help {
        padding: var(--gap-sm);
        border: 1px solid var(--border-color-default);
        height: 100%;
        overflow: auto;
        background: white;
      }

      &[sd-inset=true] > * {
        border: none !important;
        padding: 0;
      }

      &[sd-disabled=true] {
        > ._preview {
          height: auto;
        }
      }

      &[sd-dragover=true] {
        > ._editor > ._dragover {
          display: block;
        }
      }
    }
  `]
})
export class SdMarkdownEditorControl implements DoCheck {
  @Input()
  value?: string;

  @Output()
  valueChange = new EventEmitter<string | undefined>();

  @Input()
  @HostBinding("attr.view-state")
  viewState: "preview" | "edit" | "help" = "edit";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input()
  previewRenderFn?: TSdFnInfo<(plainText: string) => string | Promise<string>>;

  @Output()
  dropFiles = new EventEmitter<ISdMarkdownEditorDropFilesEvent>();

  @Input()
  resize: "both" | "horizontal" | "vertical" | "none" = "vertical";

  @Input({transform: coercionNonNullableNumber})
  rows = 3;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input()
  placeholder?: string;

  innerHTML?: string;
  busyCount = 0;

  @HostBinding("attr.sd-dragover")
  dragover = false;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheck(async run => {
      await run({
        value: [this.value],
        placeholder: [this.placeholder],
        ...getSdFnCheckData("previewRenderFn", this.previewRenderFn)
      }, async () => {
        const trimValue = this.value?.trim();
        if (trimValue != null && trimValue !== "") {
          if (this.previewRenderFn?.[0]) {
            this.busyCount++;
            const value = await this.previewRenderFn[0](this.value!);
            this.innerHTML = marked1.marked(value);
            this.busyCount--;
          }
          else {
            this.innerHTML = marked1.marked(this.value!);
          }
        }
        else if (this.placeholder !== undefined && this.placeholder !== "") {
          this.innerHTML = `<span class="tx-theme-grey-default">${this.placeholder}</span>`;
        }
        else {
          this.innerHTML = "";
        }
      });
    });
  }

  onTextareaInput(event: Event) {
    const textareaEl = event.target as HTMLTextAreaElement;
    const newValue = textareaEl.value;
    if (this.valueChange.observed) {
      this.valueChange.emit(newValue);
    }
    else {
      this.value = newValue;
    }
  }

  onTextareaDragover(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.dragover = true;
  }

  onTextareaDragLeave(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.dragover = false;
  }

  onTextareaDrop(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();

    const files = Array.from(event.dataTransfer!.files);
    const position = (event.target as HTMLTextAreaElement).selectionEnd;
    this.dropFiles.emit({position, files});
    this.dragover = false;
  }

  onTextareaPaste(event: ClipboardEvent) {
    if (!event.clipboardData) return;

    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filterExists();

    if (files.length > 0) {
      const position = (event.target as HTMLTextAreaElement).selectionEnd;
      this.dropFiles.emit({position, files});
    }
  }

  protected readonly faEye = faEye;
  protected readonly faPen = faPen;
  protected readonly faQuestion = faQuestion;
}

export interface ISdMarkdownEditorDropFilesEvent {
  position: number;
  files: File[];
}
