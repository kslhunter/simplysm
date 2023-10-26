import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import {SdListControl} from "./SdListControl";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {coercionBoolean} from "../utils/commons";
import {faChevronDown} from "@fortawesome/pro-light-svg-icons";
import {SdIconControl} from "./SdIconControl";
import {NgIf} from "@angular/common";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdCollapseControl} from "./SdCollapseControl";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdIconControl,
    NgIf,
    SdCollapseIconControl,
    SdCollapseControl,
  ],
  template: `
    <div [class]="['_content', contentClass].filterExists().join(' ')"
         [style]="contentStyle"
         (click)="onContentClick()">
      <div class="flex-row flex-gap-xs">
        <sd-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon"
                 fixedWidth/>
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        <div *ngIf="hasChildren && layout==='accordion'">
          <sd-collapse-icon [open]="open"
                            [icon]="faChevronDown"/>
        </div>
      </div>
    </div>
    <sd-collapse *ngIf="hasChildren"
                 class="_child"
                 [open]="layout === 'flat' || open">
      <ng-content select="sd-list"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      > ._content {
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;

        @media all and (pointer: coarse) {
          @include active-effect(true);
        }

        > .flex-row > ._selected-icon {
          color: var(--text-trans-lightest);
        }
      }

      &[sd-layout=accordion] {
        > ._content {
          &:hover {
            background: var(--trans-light);
          }

          &:active {
            background: var(--trans-dark);
          }
        }

        ::ng-deep ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;
          background: var(--trans-dark);
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          @media all and (pointer: coarse) {
            @include active-effect(false);
          }

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
          color: var(--theme-primary-default);
          font-weight: bold;

          &:hover,
          &:active {
            color: var(--theme-primary-default);
            font-weight: bold;
          }
        }
      }

      &[sd-has-selected-icon=true][sd-selected=true] {
        > ._content {
          background: transparent;
          color: var(--text-trans-default);

          > .flex-row > ._selected-icon {
            color: var(--theme-primary-default);
          }

          &:hover {
            background: var(--trans-light);
          }

          &:active {
            background: var(--trans-dark);
          }
        }
      }
    }
  `]
})
export class SdListItemControl {
  @Input()
  contentStyle?: string;

  @Input()
  contentClass?: string;

  @Input()
  @HostBinding("attr.sd-layout")
  layout: "accordion" | "flat" = "accordion";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-open")
  open = false;

  @Output()
  openChange = new EventEmitter<boolean>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-selected")
  selected = false;

  @Input()
  selectedIcon?: IconProp;

  @HostBinding("attr.sd-has-selected-icon")
  get hasSelectedIcon(): boolean {
    return Boolean(this.selectedIcon);
  }

  @HostBinding("attr.sd-has-children")
  get hasChildren(): boolean {
    return this.childListControl !== undefined;
  }

  @ContentChild(forwardRef(() => SdListControl))
  childListControl?: SdListControl;

  onContentClick() {
    if (this.openChange.observed) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }

  protected readonly faChevronDown = faChevronDown;
}
