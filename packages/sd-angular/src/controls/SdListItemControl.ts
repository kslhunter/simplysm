import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";
import {SdListControl} from "./SdListControl";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {coercionBoolean} from "../utils/commons";
import {SdIconControl} from "./SdIconControl";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdCollapseControl} from "./SdCollapseControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl,
    SdCollapseIconControl,
    SdCollapseControl,
  ],
  template: `
    <div [class]="['_content', contentClass].filterExists().join(' ')"
         [style]="contentStyle"
         (click)="onContentClick()"
         tabindex="0">
      <div class="flex-row flex-gap-xs">
        @if (selectedIcon && !hasChildren) {
          <sd-icon class="_selected-icon" [icon]="selectedIcon"
                   fixedWidth/>
        }
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        @if (hasChildren && layout === 'accordion') {
          <div>
            <sd-collapse-icon [open]="open"
                              [icon]="icons.angleDown"/>
          </div>
        }
      </div>
    </div>
    @if (hasChildren) {
      <sd-collapse class="_child"
                   [open]="layout === 'flat' || open">
        <ng-content select="sd-list"></ng-content>
      </sd-collapse>
    }`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    sd-list-item {
      > ._content {
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;

        @include active-effect(true);
        border-radius: var(--border-radius-default);
        margin: var(--gap-xxs);

        > .flex-row > ._selected-icon {
          color: var(--text-trans-lightest);
        }
      }
      
      > ._child{
        margin: var(--gap-xxs);
      }

      &[sd-layout=accordion] {
        > ._content {
          &:hover {
            background: var(--trans-lighter);
          }
        }

        > ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          @include active-effect(false);

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
          background: var(--trans-lighter);
          font-weight: bold;
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
  `],
  host: {
    "[attr.sd-layout]": "layout",
    "[attr.sd-open]": "open",
    "[attr.sd-selected]": "selected",
    "[attr.sd-has-selected-icon]": "!!selectedIcon",
    "[attr.sd-has-children]": "hasChildren"
  }
})
export class SdListItemControl {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input({transform: coercionBoolean}) open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() contentStyle?: string;
  @Input() contentClass?: string;
  @Input() layout: "accordion" | "flat" = "accordion";
  @Input({transform: coercionBoolean}) selected = false;
  @Input() selectedIcon?: IconProp;

  @ContentChild(forwardRef(() => SdListControl)) childListControl?: SdListControl;

  get hasChildren(): boolean {
    return this.childListControl !== undefined;
  }

  onContentClick() {
    if (this.openChange.observed) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }
}
