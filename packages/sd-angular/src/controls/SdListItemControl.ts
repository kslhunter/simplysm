import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  Output,
  QueryList
} from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { SdListControl } from "./SdListControl";
import { IconName } from "@fortawesome/fontawesome-svg-core";
import { sdIconNames } from "../commons/sdIconNames";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.class]="safeHtml('_content ' + contentClass)"
         [attr.style]="safeHtml(contentStyle)"
         (click)="open = !open; openChange.emit(open)">
      <sd-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon" fixedWidth></sd-icon>
      <ng-content></ng-content>

      <sd-collapse-icon [open]="open" *ngIf="hasChildren && layout==='accordion'"
                        style="float: right"></sd-collapse-icon>
    </div>
    <sd-collapse class="_child" [open]="layout === 'flat' || open">
      <ng-content select="sd-list"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    :host {
      > ._content {
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;

        > ._selected-icon {
          color: var(--text-brightness-lighter);
        }
      }

      &[sd-layout=accordion] {
        > ._content {
          &:hover {
            background: var(--trans-brightness-default);
          }

          &:active {
            background: var(--trans-brightness-dark);
          }
        }

        > /deep/ ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;
          background: var(--trans-brightness-default);
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          > ._content {
            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: .7;
            margin-top: var(--gap-sm);
          }
        }
      }

      &[sd-selected=true] {
        > ._content {
          background: var(--theme-color-primary-default);
          color: var(--text-brightness-rev-default);

          > ._selected-icon {
            color: var(--theme-color-primary-default);
          }

          &:hover,
          &:active {
            background: var(--theme-color-primary-default);
            color: var(--text-brightness-rev-default);
          }
        }
      }
    }
  `]
})
export class SdListItemControl {
  @Input("content.style")
  @SdInputValidate(String)
  public contentStyle?: string;

  @Input("content.class")
  @SdInputValidate(String)
  public contentClass?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["accordion", "flat"],
    notnull: true
  })
  @HostBinding("attr.sd-layout")
  public layout: "accordion" | "flat" = "accordion";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdIconNames
  })
  public selectedIcon?: IconName;

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return this.listControls !== undefined && this.listControls.length > 0;
  }

  @ContentChildren(forwardRef(() => SdListControl))
  public listControls?: QueryList<SdListControl>;


  public constructor(private readonly _sanitization: DomSanitizer) {
  }

  public safeHtml(value?: string): SafeHtml | undefined {
    return value !== undefined ? this._sanitization.bypassSecurityTrustStyle(value) : undefined;
  }
}