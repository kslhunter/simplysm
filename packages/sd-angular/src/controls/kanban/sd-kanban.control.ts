import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { SdCardControl } from "../card/sd-card.control";
import { $computed, $signal } from "../../utils/$hooks";
import { SdKanbanLaneControl } from "./sd-kanban-lane.control";
import { injectElementRef } from "../../utils/injectElementRef";
import { SdEventsDirective } from "../../directives/sd-events.directive";
import { type ISdResizeEvent } from "../../plugins/events/sd-resize.event-plugin";
import { NumberUtil } from "@simplysm/sd-core-common";
import { transformBoolean } from "../../utils/tramsforms";

@Component({
  selector: "sd-kanban",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCardControl, SdEventsDirective],
  //region styles
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

      sd-kanban {
        position: relative;
        display: block;

        &[sd-dragging-this="true"] {
          display: none;
        }

        > ._drag-position {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          pointer-events: none;
        }

        &[sd-dragging="true"] {
          > ._drag-position {
            pointer-events: auto;
          }

          > sd-card {
            pointer-events: none;
          }
        }

        > ._drop-position {
          border-radius: var(--border-radius-default);
          background: var(--trans-light);

          height: 0;
          margin-bottom: 0;
          visibility: hidden;
          transition: 0.1s linear;
          transition-property: height, margin-bottom, visibility;
        }

        &[sd-drag-over="true"] {
          > ._drop-position {
            margin-bottom: var(--gap-lg);
            visibility: visible;
          }
        }

        > sd-card {
          white-space: normal;
          user-select: none;
          cursor: pointer;
          margin-bottom: var(--gap-lg);
        }
      }
    `,
  ],
  //endregion
  template: `
    <div
      class="_drag-position"
      [style.height]="cardHeight() + 'px'"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDragDrop($event)"
    ></div>
    <div
      class="_drop-position"
      [style.height]="dragOvered() ? (dragKanban()?.heightOnDrag() ?? 0) + 'px' : '0px'"
      [style.display]="dragKanban() ? 'block' : 'none'"
    ></div>
    <sd-card
      [class]="contentClass()"
      [draggable]="draggable()"
      (dragstart)="onCardDragStart()"
      (sdResize)="onCardResize($event)"
    >
      <ng-content></ng-content>
    </sd-card>
  `,
  host: {
    "[attr.sd-dragging-this]": "dragKanban() === this",
    "[attr.sd-dragging]": "dragKanban() != null",
    "[attr.sd-drag-over]": "dragOvered()",
  },
})
export class SdKanbanControl<L, T> {
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));
  #laneControl = inject<SdKanbanLaneControl<L, T>>(forwardRef(() => SdKanbanLaneControl));
  #elRef = injectElementRef();

  value = input.required<T>();

  laneValue = $computed(() => this.#laneControl.value());

  selectable = input(false, { transform: transformBoolean });
  draggable = input(false, { transform: transformBoolean });

  selected = $computed(() => this.#boardControl.selectedValues().includes(this.value()));
  dragKanban = $computed(() => this.#boardControl.dragKanban());

  contentClass = input<string>();

  dragOvered = $signal(false);

  heightOnDrag = $signal(0);

  cardHeight = $signal(0);

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
        }
        else {
          r.push(this.value());
        }
        return r;
      });
    }
  }

  onCardResize(event: ISdResizeEvent) {
    const marginBottom = getComputedStyle(event.entry.target).marginBottom;
    this.cardHeight.set(event.entry.target.clientHeight + (NumberUtil.parseInt(marginBottom) ?? 0));
  }

  onCardDragStart() {
    if (!this.draggable()) return;

    this.heightOnDrag.set(this.#elRef.nativeElement.offsetHeight);
    this.#boardControl.dragKanban.set(this);
  }

  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

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
    if (this.#boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }

  @HostListener("document:drop.capture")
  onDocumentDrop() {
    this.dragOvered.set(false);
  }
}
