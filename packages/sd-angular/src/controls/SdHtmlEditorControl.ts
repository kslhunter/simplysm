import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdPaneControl} from "./SdPaneControl";
import {SdIconControl} from "./SdIconControl";
import {coercionBoolean, coercionNonNullableNumber} from "../utils/commons";
import {faCode, faEye, faPen} from "@fortawesome/pro-duotone-svg-icons";
import {faMinus, faPlus} from "@fortawesome/pro-solid-svg-icons";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdDockControl} from "./SdDockControl";
import {NgIf} from "@angular/common";

@Component({
  selector: "sd-html-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SdAnchorControl, SdPaneControl, SdIconControl, SdDockContainerControl, SdDockControl, NgIf],
  template: `
    <sd-dock-container>
      <sd-dock class="_toolbar" *ngIf="!disabled">
        <sd-anchor (click)="viewState = 'preview'" [class._selected]="viewState === 'preview'">
          <sd-icon [icon]="faEye" fixedWidth/>
        </sd-anchor>
        <sd-anchor (click)="viewState = 'edit'" [class._selected]="viewState === 'edit'">
          <sd-icon [icon]="faPen" fixedWidth/>
        </sd-anchor>
        <sd-anchor (click)="viewState = 'code'" [class._selected]="viewState === 'code'">
          <sd-icon [icon]="faCode" fixedWidth/>
        </sd-anchor>
        <ng-container *ngIf="rowsButton && !inset && viewState === 'code'">
          |
          <sd-anchor (click)="rows = rows + 1">
            <sd-icon [icon]="faPlus" fixedWidth/>
          </sd-anchor>
          <sd-anchor (click)="rows = rows - 1" *ngIf="rows > 1">
            <sd-icon [icon]="faMinus" fixedWidth/>
          </sd-anchor>
        </ng-container>
      </sd-dock>

      <sd-pane>
        <div #editor *ngIf="viewState !== 'code' || disabled"
             [attr.contenteditable]="viewState === 'edit' && !disabled"
             [style.min-height.px]="contentMinHeightPx"
             (input)="onContentInput($event)"
             [innerHTML]="value"></div>
        <textarea *ngIf="viewState === 'code' && !disabled"
                  [value]="value || ''"
                  [rows]="inset ? undefined : rows"
                  [style.resize]="inset ? 'none' : resize"
                  (input)="onTextareaInput($event)"
                  wrap="off"></textarea>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      border: 1px solid var(--trans-default);
      border-radius: var(--border-radius-default);
      overflow: hidden;

      ::ng-deep > sd-dock-container {
        > ._toolbar {
          > div {
            user-select: none;

            > sd-anchor {
              display: inline-block;
              padding: var(--gap-sm) 0;
              text-align: center;
              width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));

              &:hover {
                background: rgba(0, 0, 0, .05);
              }

              &._selected {
                background: var(--theme-primary-default);
                color: var(--text-trans-rev-default);
              }
            }
          }
        }

        > sd-pane {
          > div {
            @include form-control-base();
            height: 100%;
            overflow: auto;

            &[contenteditable=true] {
              cursor: text;
              background: var(--theme-secondary-lightest);
            }
          }

          > textarea {
            @include form-control-base();
            height: 100%;
            background: var(--theme-info-lightest);
            border: none;
            transition: outline-color .1s linear;
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

      &[sd-inset=true] {
        height: 100%;
        border: none;
      }
    }
  `]
})
export class SdHtmlEditorControl {
  @Input()
  value?: string;

  @Output()
  valueChange = new EventEmitter<string | undefined>();

  @Input()
  @HostBinding("attr.sd-view-state")
  viewState: "preview" | "edit" | "code" = "edit";

  @Input({transform: coercionBoolean})
  rowsButton = true;

  @Input({transform: coercionNonNullableNumber})
  rows = 3;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input({transform: coercionNonNullableNumber})
  public contentMinHeightPx = 100;

  @Input()
  public resize: "both" | "horizontal" | "vertical" | "none" = "vertical";

  @ViewChild("editor")
  editorElRef?: ElementRef<HTMLElement>;

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

  onContentInput(event: Event) {
    const editorEl = event.target as HTMLDivElement;
    const newValue = editorEl.innerHTML;
    if (this.valueChange.observed) {
      this.valueChange.emit(newValue);
    }
    else {
      this.value = newValue;
    }
  }

  protected readonly faEye = faEye;
  protected readonly faPen = faPen;
  protected readonly faCode = faCode;
  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
}
