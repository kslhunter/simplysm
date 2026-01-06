import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { $computed } from "../../../core/utils/bindings/$computed";
import { $signal } from "../../../core/utils/bindings/$signal";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { SdBusyContainerControl } from "../../overlay/busy/sd-busy-container.control";
import { SdCheckboxControl } from "../../form/choice/sd-checkbox.control";
import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { SdKanbanControl } from "./sd-kanban.control";
import { SdAnchorControl } from "../../form/button/sd-anchor.control";
import { NgIcon } from "@ng-icons/core";
import { tablerEye, tablerEyeOff } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-kanban-lane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainerControl, SdCheckboxControl, NgTemplateOutlet, SdAnchorControl, NgIcon],
  host: {
    "class": "flex-column p-default gap-default",
    "[attr.data-sd-drag-over]": "dragOvered()",
    "(dragover)": "onDragOver($event)",
    "(dragleave)": "onDragLeave($event)",
    "(drop)": "onDragDrop($event)",
  },
  template: `
    @if (useCollapse() || titleTplRef()) {
      <div>
        @if (useCollapse()) {
          <sd-anchor [theme]="'info'" (click)="onToggleCollapseButtonClick()">
            <ng-icon [svg]="collapse() ? tablerEyeOff : tablerEye" />
          </sd-anchor>
        }

        @if (titleTplRef()) {
          <div style="display: inline-block;" class="pl-default">
            <ng-template [ngTemplateOutlet]="titleTplRef() ?? null" />
          </div>
        }
      </div>
    }

    <div class="flex-fill">
      <sd-busy-container [busy]="busy()" style="min-height: 3em" [type]="'bar'">
        @if (selectableKanbanLength() > 0 || toolTplRef()) {
          <div class="tx-center mb-xl">
            @if (selectableKanbanLength() > 0) {
              <sd-checkbox
                style="float: left"
                [inline]="true"
                [theme]="'white'"
                [value]="isAllSelected()"
                (valueChange)="onSelectAllButtonClick($event)"
              />
            }
            <ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />
          </div>
        }

        @if (!collapse()) {
          <ng-content></ng-content>
        }

        <div
          class="_drop-position"
          [style.height]="dragOvered() ? (dragKanban()?.heightOnDrag() ?? 0) + 'px' : '0px'"
          [style.display]="dragKanban() ? 'block' : 'none'"
        ></div>
      </sd-busy-container>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-kanban-lane {
        > .flex-fill {
          > sd-busy-container {
            padding: var(--gap-xl) var(--gap-lg);
            background: var(--theme-gray-lightest);
            border-radius: var(--border-radius-default);
            //overflow: hidden;
            height: 100%;

            > ._drop-position {
              pointer-events: none;
              border-radius: var(--border-radius-default);
              background: var(--trans-light);

              height: 0;
              margin-bottom: 0;
              visibility: hidden;
              transition: 0.1s linear;
              transition-property: height, margin-bottom, visibility;
            }
          }
        }

        &[data-sd-drag-over="true"] {
          > .flex-fill > sd-busy-container > ._drop-position {
            margin-bottom: var(--gap-lg);
            visibility: visible;
          }
        }
      }
    `,
  ],
})
export class SdKanbanLaneControl<L, T> {
  private readonly _boardControl = inject<SdKanbanBoardControl<L, T>>(
    forwardRef(() => SdKanbanBoardControl),
  );

  busy = input(false, { transform: transformBoolean });

  useCollapse = input(false, { transform: transformBoolean });

  collapse = model(false);

  value = input<L>();

  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  toolTplRef = contentChild<any, TemplateRef<void>>("toolTpl", { read: TemplateRef });
  titleTplRef = contentChild<any, TemplateRef<void>>("titleTpl", { read: TemplateRef });

  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  dragKanban = $computed(() => this._boardControl.dragKanban());

  dragOvered = $signal(false);

  selectableKanbanLength = $computed(
    () => this.kanbanControls().filter((ctrl) => ctrl.selectable()).length,
  );

  onToggleCollapseButtonClick() {
    this.collapse.update((v) => !v);
  }

  onSelectAllButtonClick(val: boolean) {
    if (val) {
      this._boardControl.selectedValues.update((v) => {
        const r = [...v];
        for (const ctrl of this.kanbanControls()) {
          if (ctrl.value() == null) continue;
          if (!v.includes(ctrl.value()!)) {
            r.push(ctrl.value()!);
          }
        }
        return r.length === v.length ? v : r;
      });
    } else {
      this._boardControl.selectedValues.update((v) => {
        const r = [...v];
        for (const ctrl of this.kanbanControls()) {
          if (ctrl.value() == null) continue;
          if (v.includes(ctrl.value()!)) {
            r.remove((item) => item === ctrl.value());
          }
        }
        return r.length === v.length ? v : r;
      });
    }
  }

  onDragOver(event: DragEvent) {
    if (this._boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(false);
  }

  onDragDrop(event: DragEvent) {
    if (this._boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this._boardControl.onDropTo(this);
  }

  protected readonly tablerEyeOff = tablerEyeOff;
  protected readonly tablerEye = tablerEye;
}
