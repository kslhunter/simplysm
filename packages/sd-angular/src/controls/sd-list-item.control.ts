import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  inject,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { SdRippleDirective } from "../directives/sd-ripple.directive";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/bindings/$computed";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdCollapseIconControl } from "./sd-collapse-icon.control";
import { SdCollapseControl } from "./sd-collapse.control";

import { SdListControl } from "./sd-list.control";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdCollapseIconControl,
    SdCollapseControl,
    SdRippleDirective,
    NgTemplateOutlet,
    FaIconComponent,
  ],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-list-item {
        > ._content {
          padding: var(--gap-sm) var(--gap-default);

          border-radius: var(--border-radius-default);
          margin: var(--gap-xs);

          > .flex-row > ._selected-icon {
            color: var(--text-trans-lightest);
          }
        }

        &:not([sd-readonly="true"]) {
          > ._content {
            cursor: pointer;
          }
        }

        > ._child {
          margin: var(--gap-xs);
        }

        &[sd-layout="accordion"] {
          &:not([sd-readonly="true"]) {
            > ._content {
              &:hover {
                background: var(--trans-lighter);
              }
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
            //background: transparent;
            color: var(--text-trans-default);

            > .flex-row > ._selected-icon {
              color: var(--theme-primary-default);
            }

            &:hover {
              background: var(--trans-lighter);
            }

            /*&:active {
              background: var(--trans-dark);
            }*/
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
      [sd-ripple]="!readonly() && !(layout() === 'flat' && hasChildren())"
    >
      <div class="flex-row flex-gap-xs">
        @if (selectedIcon() && !hasChildren()) {
          <fa-icon class="_selected-icon" [icon]="selectedIcon()!" [fixedWidth]="true" />
        }
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        @if (toolsTemplateRef()) {
          <div>
            <ng-template [ngTemplateOutlet]="toolsTemplateRef()!" />
          </div>
        }

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
    "[attr.sd-readonly]": "readonly()",
    "[attr.sd-has-selected-icon]": "!!selectedIcon()",
    "[attr.sd-has-children]": "hasChildren()",
  },
})
export class SdListItemControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  open = model(false);

  selectedIcon = input<IconDefinition>();
  selected = input(false, { transform: transformBoolean });

  layout = input<"flat" | "accordion">("accordion");
  contentStyle = input<string>();
  contentClass = input<string>();

  readonly = input(false, { transform: transformBoolean });

  toolsTemplateRef = contentChild("toolsTemplate", { read: TemplateRef });
  childListControl = contentChild<SdListControl>(forwardRef(() => SdListControl));

  hasChildren = $computed(() => this.childListControl() !== undefined);

  onContentClick() {
    this.open.update((v) => !v);
  }
}
