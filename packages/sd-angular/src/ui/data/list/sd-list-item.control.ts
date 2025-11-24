import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import { SdListControl } from "./sd-list.control";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdRippleDirective } from "../../../core/directives/sd-ripple.directive";
import { SdCollapseIconControl } from "../../navigation/collapse/sd-collapse-icon.control";
import { SdCollapseControl } from "../../navigation/collapse/sd-collapse.control";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FaIconComponent,
    SdRippleDirective,
    SdCollapseIconControl,
    SdCollapseControl,
  ],
  host: {
    "[attr.data-sd-layout]": "layout()",
    "[attr.data-sd-open]": "open()",
    "[attr.data-sd-selected]": "selected()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-has-selected-icon]": "!!selectedIcon()",
    "[attr.data-sd-has-children]": "hasChildren()",
  },
  template: `
    <div
      class="_content flex-row gap-xs"
      [class]="contentClass()"
      [style]="contentStyle()"
      (click)="onContentClick()"
      tabindex="0"
      [sd-ripple]="!readonly() && !(layout() === 'flat' && hasChildren())"
    >
      @if (selectedIcon() && !hasChildren()) {
        <fa-icon
          [class.tx-theme-primary-default]="selected()"
          [class.tx-trans-lightest]="!selected()"
          [icon]="selectedIcon()!"
          [fixedWidth]="true"
        />
      }
      <div class="flex-fill">
        <ng-content />
      </div>

      @if (toolTplRef()) {
        <div>
          <ng-template [ngTemplateOutlet]="toolTplRef()!" />
        </div>
      }

      @if (hasChildren() && layout() === "accordion") {
        <sd-collapse-icon [open]="open()" />
      }
    </div>
    @if (hasChildren()) {
      <sd-collapse class="_child" [open]="layout() === 'flat' || open()">
        <ng-content select="sd-list"></ng-content>
      </sd-collapse>
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-list-item {
        > ._content {
          padding: var(--gap-sm) var(--gap-default);
          cursor: pointer;
        }

        &[data-sd-readonly="true"] {
          > ._content {
            cursor: default;
          }
        }

        &[data-sd-layout="accordion"] {
          &:not([data-sd-readonly="true"]) {
            > ._content {
              &:hover {
                background: var(--trans-lighter);
              }
            }
          }

          > ._child > ._content > sd-list {
            padding: var(--gap-xs) 0;
          }
        }

        &[data-sd-layout="flat"][data-sd-has-children="true"] {
          > ._content {
            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: 0.7;
          }
        }

        &[data-sd-selected="true"] {
          > ._content {
            background: var(--trans-lighter);
            font-weight: bold;
          }
        }

        &[data-sd-has-selected-icon="true"][data-sd-selected="true"] {
          > ._content {
            color: var(--text-trans-default);

            &:hover {
              background: var(--trans-lighter);
            }
          }
        }
      }

      .sd-theme-mobile > sd-list-item {
        > ._content:hover {
          background: transparent;
        }
      }
    `,
  ],
})
export class SdListItemControl {
  open = model(false);

  selectedIcon = input<IconDefinition>();
  selected = input(false, { transform: transformBoolean });

  layout = input<"flat" | "accordion">("accordion");
  contentStyle = input<string>();
  contentClass = input<string>();

  readonly = input(false, { transform: transformBoolean });

  toolTplRef = contentChild("toolTpl", { read: TemplateRef });
  childListControl = contentChild<SdListControl>(forwardRef(() => SdListControl));

  hasChildren = $computed(() => this.childListControl() !== undefined);

  onContentClick() {
    this.open.update((v) => !v);
  }
}
