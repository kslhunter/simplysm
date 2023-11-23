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
import {SdIconControl} from "./SdIconControl";
import {NgIf} from "@angular/common";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdCollapseControl} from "./SdCollapseControl";
import {faAngleDown} from "@fortawesome/pro-duotone-svg-icons/faAngleDown";

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
         (click)="onContentClick()"
         tabindex="0">
      <div class="flex-row flex-gap-xs">
        <sd-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon"
                 fixedWidth/>
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        <div *ngIf="hasChildren && layout==='accordion'">
          <sd-collapse-icon [open]="open"
                            [icon]="faAngleDown"/>
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

        body.sd-theme-modern &,
        body.sd-theme-kiosk &,
        body.sd-theme-mobile & {
          @include active-effect(true);
          border-radius: var(--border-radius-default);
          margin: var(--gap-xxs);
        }

        > .flex-row > ._selected-icon {
          color: var(--text-trans-lightest);
        }
      }

      &[sd-layout=accordion] {
        > ._content {
          body.sd-theme-compact & {
            &:hover {
              background: var(--trans-light);
            }

            &:active {
              background: var(--trans-dark);
            }
          }


          body.sd-theme-modern &,
          body.sd-theme-kiosk &,
          body.sd-theme-mobile & {
            &:hover {
              background: var(--trans-lighter);
            }
          }
        }

        ::ng-deep ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;

          body.sd-theme-compact & {
            background: var(--trans-dark);
          }
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          body.sd-theme-modern &,
          body.sd-theme-kiosk &,
          body.sd-theme-mobile & {
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
          body.sd-theme-compact & {
            color: var(--theme-primary-default);
            font-weight: bold;

            &:hover,
            &:active {
              color: var(--theme-primary-default);
              font-weight: bold;
            }
          }

          body.sd-theme-modern &,
          body.sd-theme-kiosk &,
          body.sd-theme-mobile & {
            background: var(--trans-lighter);
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

  protected readonly faAngleDown = faAngleDown;
}
