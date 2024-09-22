import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  forwardRef,
  HostListener,
  inject,
  input,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed } from "../utils/$hooks";
import { SdKanbanBoardControl } from "./SdKanbanBoardControl";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "sd-kanban-lane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainerControl, SdCheckboxControl, NgTemplateOutlet],
  //region styles
  styles: [
    /* language=SCSS */ `
      sd-kanban-lane {
        display: block;
        background: var(--theme-grey-lightest);
        border-radius: var(--border-radius-default);
        overflow: hidden;
        height: 100%;

        > sd-busy-container {
          display: flex;
          flex-wrap: nowrap;
          flex-direction: column;
          gap: var(--gap-lg);

          padding: var(--gap-xl) var(--gap-lg);
        }

        > ._drop-position {
          display: none;
        }

        &[sd-drag-over="true"] {
          > .drop-position {
            display: block;
            border-radius: var(--border-radius-default);
            border: 2px dashed var(--border-color-default);
            height: 10em;
          }
        }
      }
    `,
  ],
  //endregion
  template: `
    <sd-busy-container [busy]="busy()">
      @if (kanbanControls().length > 0 || titleTemplateRef()) {
        <div class="tx-center">
          @if (kanbanControls().length > 0) {
            <sd-checkbox
              style="float: left"
              [inline]="true"
              theme="white"
              [value]="isAllSelected()"
              (valueChange)="onSelectAllButtonClick($event)"
            />
          }
          <ng-template [ngTemplateOutlet]="titleTemplateRef() ?? null" />
        </div>
      }

      <ng-content></ng-content>

      <div class="_drop-position"></div>
    </sd-busy-container>
  `,
})
export class SdKanbanLaneControl<L, T> {
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  busy = input(false);

  value = input.required<L>();

  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  titleTemplateRef = contentChild<any, TemplateRef<void>>("titleTemplate", { read: TemplateRef });

  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  onSelectAllButtonClick(val: boolean) {
    if (val) {
      for (const ctrl of this.kanbanControls()) {
        this.#boardControl.selectedValues.update((v) => {
          if (!v.includes(ctrl.value())) {
            return [...v, ctrl.value()];
          }
          return v;
        });
      }
    } else {
      for (const ctrl of this.kanbanControls()) {
        this.#boardControl.selectedValues.update((v) => {
          if (v.includes(ctrl.value())) {
            return v.filter((item) => item !== ctrl.value());
          }
          return v;
        });
      }
    }
  }

  @HostListener("dragdrop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }
}
