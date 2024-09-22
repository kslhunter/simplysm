import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdKanbanBoardControl } from "./SdKanbanBoardControl";
import { SdCardControl } from "./SdCardControl";
import { $computed, $signal } from "../utils/$hooks";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";

@Component({
  selector: "sd-kanban",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCardControl],
  //region styles
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-kanban {
        > ._drop-position {
          display: none;
        }

        &[sd-drag-over="true"] {
          > ._drop-position {
            display: block;
            border-radius: var(--border-radius-default);
            border: 2px dashed var(--border-color-default);
            height: 8em;
            margin-bottom: var(--gap-lg);
          }
        }

        > sd-card {
          white-space: normal;
          user-select: none;
          cursor: pointer;
        }

        &[sd-dragging="true"] {
          display: none;
        }
      }
    `,
  ],
  //endregion
  template: `
    <div class="_drop-position"></div>
    <sd-card [class]="contentClass()" [draggable]="draggable()" (dragstart)="onCardDragStart($event)">
      <ng-content></ng-content>
    </sd-card>
  `,
  host: {
    "[attr.sd-drag-over]": "dragOvered()",
    "[attr.sd-dragging]": "dragging()",
  },
})
export class SdKanbanControl<L, T> {
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));
  #laneControl = inject<SdKanbanLaneControl<L, T>>(forwardRef(() => SdKanbanLaneControl));

  value = input.required<T>();

  laneValue = $computed(() => this.#laneControl.value());

  selectable = input(false);
  draggable = input(false);

  dragOvered = $signal(false);
  selected = $computed(() => this.#boardControl.selectedValues().includes(this.value()));
  dragging = $computed(() => this.#boardControl.dragKanban() === this);

  contentClass = input<string>();

  @HostListener("click", ["$event"])
  onClick(event: MouseEvent) {
    if (event.shiftKey) {
      if (!this.selectable()) return;

      event.preventDefault();
      event.stopPropagation();

      this.#boardControl.selectedValues.update((v) => {
        const r = [...v];
        if (v.includes(this.value())) {
          r.remove(this.value());
        } else {
          r.push(this.value());
        }
        return r;
      });
    }
  }

  onCardDragStart(event: DragEvent) {
    if (!this.draggable()) return;

    this.#boardControl.dragKanban.set(this);
  }

  #rafKey?: number;

  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.#rafKey != null) {
      cancelAnimationFrame(this.#rafKey);
    }
    this.dragOvered.set(true);
  }

  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.#rafKey = requestAnimationFrame(() => {
      this.dragOvered.set(false);
    });
  }

  @HostListener("dragdrop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }

  @HostListener("document:dragend")
  onDragEnd() {
    this.dragOvered.set(false);
  }
}
