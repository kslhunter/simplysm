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
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdListControl } from "./SdListControl";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { SdIconsRootProvider } from "../root-providers/SdIconsRootProvider";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.class]="'_content ' + contentClass"
         [attr.style]="safeHtml(contentStyle)"
         (click)="onContentClick()">
      <fa-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon"
               [fixedWidth]="true"></fa-icon>
      <ng-content></ng-content>

      <sd-collapse-icon [open]="open" *ngIf="hasChildren && layout==='accordion'"
                        [icon]="icons.get('chevronDown')"
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
          //color: var(--text-brightness-lighter);
          color: transparent;
        }
      }

      &[sd-layout=accordion] {
        > ._content {
          &:hover {
            background: var(--trans-brightness-light);
          }

          &:active {
            background: var(--trans-brightness-dark);
          }
        }

        ::ng-deep ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;
          background: var(--trans-brightness-dark);
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

          &:hover,
          &:active {
            background: var(--theme-color-primary-default);
            color: var(--text-brightness-rev-default);
          }
        }
      }

      &[sd-has-selected-icon=true][sd-selected=true] {
        > ._content {
          background: transparent;
          color: var(--text-brightness-default);

          > ._selected-icon {
            color: var(--theme-color-primary-default);
          }

          &:hover {
            background: var(--trans-brightness-light);
          }

          &:active {
            background: var(--trans-brightness-dark);
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
  public selectedIcon?: IconProp;

  @HostBinding("attr.sd-has-selected-icon")
  public get hasSelectedIcon(): boolean {
    return Boolean(this.selectedIcon);
  }

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return this.listControls !== undefined && this.listControls.length > 0;
  }

  @ContentChildren(forwardRef(() => SdListControl))
  public listControls?: QueryList<SdListControl>;


  public constructor(private readonly _sanitization: DomSanitizer,
                     public readonly icons: SdIconsRootProvider) {
  }

  public safeHtml(value?: string): SafeHtml | undefined {
    return value !== undefined ? this._sanitization.bypassSecurityTrustStyle(value) : undefined;
  }

  public onContentClick(): void {
    if (this.openChange.observed) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }
}
