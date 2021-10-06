import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-html-editor",
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
        <sd-anchor (click)="viewState = 'code'" [class._selected]="viewState === 'code'">
          <sd-icon [icon]="'code'"></sd-icon>
        </sd-anchor>
        <ng-container *ngIf="rowsButton && !inset && viewState === 'code'">
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
        <div *ngIf="viewState !== 'code' || disabled"
             [attr.contenteditable]="viewState === 'edit' && !disabled"
             [innerHTML]="content"
             (input)="onContentInput($event)"></div>
        <textarea *ngIf="viewState === 'code' && !disabled"
                  [value]="value || ''"
                  [rows]="inset ? undefined : rows"
                  [style.resize]="inset ? 'none' : resize"
                  (input)="onTextareaInput($event)"
                  wrap="off"></textarea>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      border: 1px solid var(--trans-color-default);

      /deep/ > sd-dock-container {
        > ._toolbar {
          user-select: none;

          > sd-anchor {
            display: inline-block;
            padding: var(--gap-sm) 0;
            text-align: center;
            width: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip));

            &:hover {
              background: rgba(0, 0, 0, .05);
            }

            &._selected {
              background: var(--theme-primary-default);
              color: var(--text-reverse-color-default);
            }
          }
        }

        > sd-pane {
          > div {
            @include form-control-base();
            height: 100%;

            &[contenteditable=true] {
              cursor: text;
              background: var(--theme-info-lightest);
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
              color: var(--text-color-lighter);
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
  @SdInputValidate(String)
  public get value(): string | undefined {
    return this._value;
  }

  public set value(value: string | undefined) {
    if (this._value !== value) {
      this._value = value;
      this.content = this._sanitizer.bypassSecurityTrustHtml(value ?? "");
    }
  }

  private _value?: string;

  @Output()
  public readonly valueChange = new EventEmitter<string>();

  @Input()
  @SdInputValidate({ type: String, includes: ["preview", "edit", "code"] })
  public viewState: "preview" | "edit" | "code" = "edit";

  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  public rowsButton = true;

  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public rows = 3;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["both", "horizontal", "vertical", "none"]
  })
  public resize = "vertical";

  public content: SafeHtml = "";

  public constructor(private readonly _sanitizer: DomSanitizer) {
  }

  public onTextareaInput(event: Event): void {
    const textareaEl = event.target as HTMLTextAreaElement;
    const newValue = textareaEl.value;
    if (this.valueChange.observers.length > 0) {
      this.valueChange.emit(newValue);
    }
    else {
      this._value = newValue;
    }
  }

  public onContentInput(event: Event): void {
    const editorEl = event.target as HTMLDivElement;
    const newValue = editorEl.innerHTML;
    if (this.valueChange.observers.length > 0) {
      this.valueChange.emit(newValue);
    }
    else {
      this._value = newValue;
    }
  }
}
