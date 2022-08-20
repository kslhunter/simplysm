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
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdListControl } from "./SdListControl";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content" (click)="onContentClick()"
         [ngClass]="contentClass">
      <fa-icon class="_select-icon" *ngIf="selectIcon && !hasChildren" [icon]="selectIcon"
               [fixedWidth]="true"></fa-icon>
      <ng-content></ng-content>

      <fa-icon *ngIf="hasChildren && layout==='accordion'"
               [icon]="icons.falChevronDown | async"
               style="float: right;"
               [sdAnimate]="[open, {transform: 'rotate(90deg)'}, {transform:'none'}]"></fa-icon>
    </div>
    <sd-collapse class="_child" [open]="layout === 'flat' || open">
      <ng-content select="sd-list"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    :host {
      > ._content {
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;

        > ._select-icon {
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

        > ::ng-deep ._child > ._content > sd-list {
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

      &[sd-has-select-icon=true][sd-selected=true] {
        > ._content {
          background: transparent;
          color: var(--text-brightness-default);

          > ._select-icon {
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
  public icons = {
    falChevronDown: import("@fortawesome/pro-light-svg-icons/faChevronDown").then(m => m.definition)
  };

  @Input()
  @SdInputValidate(String)
  public contentClass?: string[];

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
  public selectIcon?: IconProp;

  @HostBinding("attr.sd-has-select-icon")
  public get hasSelectIcon(): boolean {
    return Boolean(this.selectIcon);
  }

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return this.listControls !== undefined && this.listControls.length > 0;
  }

  @ContentChildren(forwardRef(() => SdListControl))
  public listControls?: QueryList<SdListControl>;

  public onContentClick(): void {
    if (this.openChange.observed) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }
}
