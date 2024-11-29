import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  forwardRef,
  inject,
  input,
  output,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdListControl } from "./SdListControl";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { SdCollapseIconControl } from "./SdCollapseIconControl";
import { SdCollapseControl } from "./SdCollapseControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed, $model } from "../utils/$hooks";
import { SdUseRippleDirective } from "../directives/SdUseRippleDirective";
import { transformBoolean } from "../utils/transforms";
import { NgTemplateOutlet } from "@angular/common";
import { SdIconControl } from "./SdIconControl";

/**
 * 리스트 아이템 컨트롤
 *
 * 계층형 리스트를 구성하는 아이템 컴포넌트입니다.
 *
 * @example
 *
 * <sd-list>
 *   <sd-list-item>
 *     <div>아이템 1</div>
 *   </sd-list-item>
 *   <sd-list-item [collapse]="true">
 *     <div>아이템 2</div>
 *     <sd-list>
 *       <sd-list-item>
 *         <div>하위 아이템 1</div>
 *       </sd-list-item>
 *     </sd-list>
 *   </sd-list-item>
 * </sd-list>
 *
 *
 * @remarks
 * - 아코디언 또는 플랫 레이아웃을 지원합니다
 * - collapse 속성을 통해 하위 아이템을 접을 수 있습니다
 * - readonly 속성으로 클릭 이벤트를 비활성화할 수 있습니다
 * - 리플 이펙트가 기본으로 적용됩니다
 * - 선택 상태를 아이콘으로 표시할 수 있습니다
 */
@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapseIconControl, SdCollapseControl, SdUseRippleDirective, NgTemplateOutlet, SdIconControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-list-item {
        > ._content {
          padding: var(--gap-sm) var(--gap-default);

          border-radius: var(--border-radius-default);
          margin: var(--gap-xxs);

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
          margin: var(--gap-xxs);
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
            background: transparent;
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
      [sdUseRipple]="!readonly() && !(layout() === 'flat' && hasChildren())"
    >
      <div class="flex-row flex-gap-xs">
        @if (selectedIcon() && !hasChildren()) {
          <sd-icon class="_selected-icon" [icon]="selectedIcon()!" fixedWidth />
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
  icons = inject(SdAngularConfigProvider).icons;

  _open = input(false, { alias: "open", transform: transformBoolean });
  _openChange = output<boolean>({ alias: "openChange" });
  open = $model(this._open, this._openChange);

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
