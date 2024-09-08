import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import { SdPaneControl } from "./SdPaneControl";
import { SdIconControl } from "./SdIconControl";
import { coercionBoolean, coercionNumber } from "../utils/commons";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { sdCheck } from "../utils/hooks";
import { SdAnchorControl } from "./SdAnchorControl";

/** @deprecated */
@Component({
  selector: "sd-html-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdPaneControl, SdIconControl, SdDockContainerControl, SdDockControl],
  template: `
    <sd-dock-container>
      @if (!disabled) {
        <sd-dock class="_toolbar">
          <div class="flex-row flex-gap-xs">
            <sd-anchor (click)="viewState = 'preview'" [class._selected]="viewState === 'preview'">
              <sd-icon [icon]="icons.eye" fixedWidth />
            </sd-anchor>
            <sd-anchor (click)="viewState = 'edit'" [class._selected]="viewState === 'edit'">
              <sd-icon [icon]="icons.pen" fixedWidth />
            </sd-anchor>
            <sd-anchor (click)="viewState = 'code'" [class._selected]="viewState === 'code'">
              <sd-icon [icon]="icons.code" fixedWidth />
            </sd-anchor>
          </div>
          <div class="flex-grow flex-row flex-gap-xs" style="justify-content: end">
            @if (rowsButton && !inset && viewState === "code") {
              <sd-anchor (click)="rows = rows + 1" theme="info">
                <sd-icon [icon]="icons.plus" fixedWidth />
              </sd-anchor>
              @if (rows > 1) {
                <sd-anchor (click)="rows = rows - 1" theme="info">
                  <sd-icon [icon]="icons.minus" fixedWidth />
                </sd-anchor>
              }
            }
          </div>
        </sd-dock>
      }

      <sd-pane>
        @if (viewState !== "code" || disabled) {
          <div
            #editorEl
            [attr.contenteditable]="viewState === 'edit' && !disabled"
            [style.min-height.px]="contentMinHeightPx"
            (input)="onContentInput($event)"
          ></div>
        } @else {
          <textarea
            [value]="value ?? ''"
            [rows]="inset ? undefined : rows"
            [style.resize]="inset ? 'none' : resize"
            (input)="onTextareaInput($event)"
            wrap="off"
          ></textarea>
        }
      </sd-pane>
    </sd-dock-container>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-html-editor {
        display: block;
        border: 1px solid var(--trans-default);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > sd-dock-container {
          > ._toolbar {
            display: flex;
            flex-direction: row;
            //gap: var(--gap-xs);
            padding: var(--gap-xs);

            user-select: none;

            > div > sd-anchor {
              display: inline-block;
              padding: var(--gap-sm) 0;
              text-align: center;
              width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));

              &:hover {
                background: rgba(0, 0, 0, 0.05);
              }

              &._selected {
                background: var(--theme-primary-default);
                color: var(--text-trans-rev-default);
              }
            }
          }

          > sd-pane {
            > div {
              @include form-control-base();
              height: 100%;
              overflow: auto;

              &[contenteditable="true"] {
                cursor: text;
                background: var(--theme-secondary-lightest);
              }
            }

            > textarea {
              @include form-control-base();
              height: 100%;
              background: var(--theme-info-lightest);
              border: none;
              transition: outline-color 0.1s linear;
              outline: 1px solid transparent;
              outline-offset: -1px;

              &::-webkit-input-placeholder {
                color: var(--text-trans-lighter);
              }

              &:focus {
                outline-color: var(--theme-primary-default);
              }
            }
          }
        }

        &[sd-inset="true"] {
          height: 100%;
          border: none;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-view-state]": "viewState",
    "[attr.sd-inset]": "inset",
    "[attr.sd-disabled]": "disabled",
  },
})
export class SdHtmlEditorControl {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input() viewState: "preview" | "edit" | "code" = "edit";

  @Input({ transform: coercionBoolean }) inset = false;
  @Input({ transform: coercionBoolean }) rowsButton = true;
  @Input({ transform: coercionNumber }) rows = 3;
  @Input({ transform: coercionBoolean }) disabled = false;
  @Input({ transform: coercionNumber }) contentMinHeightPx = 100;
  @Input() resize: "both" | "horizontal" | "vertical" | "none" = "vertical";

  @ViewChild("editorEl") editorElRef?: ElementRef<HTMLElement>;

  constructor() {
    sdCheck.outside(this,
      [
() => [this.value],
() => [!!this.editorElRef?.nativeElement],
      ],
      () => {
        if (this.editorElRef) {
          const innerHTML = this.editorElRef.nativeElement.innerHTML;
          if (innerHTML !== this.value) {
            this.editorElRef.nativeElement.innerHTML = this.value ?? "";
          }
        }
      },
    );
  }

  onTextareaInput(event: Event) {
    const textareaEl = event.target as HTMLTextAreaElement;
    const newValue = textareaEl.value;
    if (this.value !== newValue) {
      this.value = newValue;
      this.valueChange.emit(newValue);
    }
  }

  onContentInput(event: Event) {
    const editorEl = event.target as HTMLDivElement;
    const newValue = editorEl.innerHTML;
    if (this.value !== newValue) {
      this.value = newValue;
      this.valueChange.emit(newValue);
    }
  }
}
