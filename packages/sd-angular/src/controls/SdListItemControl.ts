import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdListControl } from "./SdListControl";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { SdCollapseIconControl } from "./SdCollapseIconControl";
import { SdCollapseControl } from "./SdCollapseControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $computed } from "../utils/$hooks";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapseIconControl, SdCollapseControl, FaIconComponent],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-list-item {
        > ._content {
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;

          border-radius: var(--border-radius-default);
          margin: var(--gap-xxs);

          > .flex-row > ._selected-icon {
            color: var(--text-trans-lightest);
          }
        }

        > ._child {
          margin: var(--gap-xxs);
        }

        &[sd-layout="accordion"] {
          > ._content {
            @include active-effect(true);

            &:hover {
              background: var(--trans-lighter);
            }
          }

          > ._child > ._content > sd-list {
            padding: var(--gap-sm) 0;
          }
        }

        &[sd-layout="flat"] {
          > ._content {
            display: none;
          }

          &[sd-has-children="true"] {
            @include active-effect(false);

            > ._content {
              display: block;
              background: transparent;
              cursor: default;
              font-size: var(--font-size-sm);
              opacity: 0.7;
              margin-top: var(--gap-sm);
            }
          }
        }

        &[sd-selected="true"] {
          > ._content {
            background: var(--trans-lighter);
            font-weight: bold;
          }
        }

        &[sd-has-selected-icon="true"][sd-selected="true"] {
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
    `,
  ],
  template: `
    <div
      [class]="['_content', contentClass()].filterExists().join(' ')"
      [style]="contentStyle()"
      (click)="onContentClick()"
      tabindex="0"
    >
      <div class="flex-row flex-gap-xs">
        @if (selectedIcon() && !hasChildren()) {
          <fa-icon class="_selected-icon" [icon]="selectedIcon()!" [fixedWidth]="true" />
        }
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        @if (hasChildren() && layout() === "accordion") {
          <div>
            <sd-collapse-icon [open]="open()" />
          </div>
        }
      </div>
    </div>
    @if (hasChildren()) {
      <sd-collapse class="_child" [open]="layout() === 'flat' || open()">
        <ng-content select="sd-list"></ng-content>
      </sd-collapse>
    }
  `,
  host: {
    "[attr.sd-layout]": "layout()",
    "[attr.sd-open]": "open()",
    "[attr.sd-selected]": "selected()",
    "[attr.sd-has-selected-icon]": "!!selectedIcon()",
    "[attr.sd-has-children]": "hasChildren()",
  },
})
export class SdListItemControl {
  icons = inject(SdAngularConfigProvider).icons;

  open = model(false);

  selectedIcon = input<IconDefinition>();
  selected = input(false);

  layout = input<"flat" | "accordion">("accordion");
  contentStyle = input<string>();
  contentClass = input<string>();

  childListControl = contentChild<SdListControl>(forwardRef(() => SdListControl));

  hasChildren = $computed(() => this.childListControl() !== undefined);

  onContentClick() {
    this.open.update((v) => !v);
  }
}
