import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  forwardRef,
  HostListener,
  inject,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $signal } from "../../utils/bindings/$signal";
import { transformBoolean } from "../../utils/transforms/tramsformBoolean";
import { SdBusyContainerControl } from "../layout/sd-busy-container.control";
import { SdCheckboxControl } from "../form-control/sd-checkbox.control";

import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { SdKanbanControl } from "./sd-kanban.control";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAnchorControl } from "../form-control/sd-anchor.control";

@Component({
  selector: "sd-kanban-lane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdCheckboxControl,
    NgTemplateOutlet,
    FaIconComponent,
    SdAnchorControl,
  ],
  host: {
    "class": "flex-column p-default gap-default",
    "[attr.data-sd-drag-over]": "dragOvered()",
  },
  template: `
    @if (useCollapse() || titleTplRef()) {
      <div>
        @if (useCollapse()) {
          <sd-anchor [theme]="'info'" (click)="onToggleCollapseButtonClick()">
            <fa-icon [icon]="collapse() ? icons.eyeSlash : icons.eye" [fixedWidth]="true" />
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
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  busy = input(false, { transform: transformBoolean });

  useCollapse = input(false, { transform: transformBoolean });

  collapse = model(false);

  value = input<L>();

  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  toolTplRef = contentChild<any, TemplateRef<void>>("toolTpl", { read: TemplateRef });
  titleTplRef = contentChild<any, TemplateRef<void>>("titleTpl", { read: TemplateRef });

  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  dragKanban = $computed(() => this.#boardControl.dragKanban());

  dragOvered = $signal(false);

  selectableKanbanLength = $computed(
    () => this.kanbanControls().filter((ctrl) => ctrl.selectable()).length,
  );

  onToggleCollapseButtonClick() {
    this.collapse.update((v) => !v);
  }

  onSelectAllButtonClick(val: boolean) {
    if (val) {
      this.#boardControl.selectedValues.update((v) => {
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
      this.#boardControl.selectedValues.update((v) => {
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

  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(true);
  }

  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(false);
  }

  @HostListener("drop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }
}
