import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { SdKanbanLaneControl } from "./sd-kanban-lane.control";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";
import { SdEventsDirective } from "../../../core/directives/sd-events.directive";
import type { ISdResizeEvent } from "../../../core/plugins/events/sd-resize-event.plugin";
import { NumberUtils } from "@simplysm/sd-core-common";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";
import { $signal } from "../../../core/utils/bindings/$signal";
import { SdCardDirective } from "../sd-card.directive";

@Component({
  selector: "sd-kanban",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective, SdCardDirective],
  host: {
    "[attr.data-sd-dragging-this]": "dragKanban() === this",
    "[attr.data-sd-dragging]": "dragKanban() != null",
    "[attr.data-sd-drag-over]": "dragOvered()",
    "(document:drop.capture)": "onDocumentDrop()",
    "(click)": "onHostClick($event)",
  },
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
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-kanban {
        position: relative;
        display: block;

        &[data-sd-dragging-this="true"] {
          display: none;
        }

        > ._drag-position {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          pointer-events: none;
        }

        &[data-sd-dragging="true"] {
          > ._drag-position {
            pointer-events: auto;
          }

          > sd-card {
            pointer-events: none;
            cursor: pointer;
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

        &[data-sd-drag-over="true"] {
          > ._drop-position {
            margin-bottom: var(--gap-lg);
            visibility: visible;
          }
        }

        > sd-card {
          white-space: normal;
          user-select: none;
          margin-bottom: var(--gap-lg);
        }
      }
    `,
  ],
})
export class SdKanbanControl<L, T> {
  private readonly _boardControl = inject<SdKanbanBoardControl<L, T>>(
    forwardRef(() => SdKanbanBoardControl),
  );
  private readonly _laneControl = inject<SdKanbanLaneControl<L, T>>(
    forwardRef(() => SdKanbanLaneControl),
  );
  private readonly _elRef = injectElementRef();

  value = input<T>();

  laneValue = $computed(() => this._laneControl.value());

  selectable = input(false, { transform: transformBoolean });
  draggable = input(false, { transform: transformBoolean });

  selected = $computed(
    () => this.value() != null && this._boardControl.selectedValues().includes(this.value()!),
  );
  dragKanban = $computed(() => this._boardControl.dragKanban());

  contentClass = input<string>();

  dragOvered = $signal(false);

  heightOnDrag = $signal(0);

  cardHeight = $signal(0);

  onHostClick(event: MouseEvent) {
    if (event.shiftKey) {
      if (!this.selectable()) return;
      if (this.value() == null) return;

      event.preventDefault();
      event.stopPropagation();

      this._boardControl.selectedValues.update((v) => {
        const r = [...v];
        if (v.includes(this.value()!)) {
          r.remove(this.value()!);
        } else {
          r.push(this.value()!);
        }
        return r;
      });
    }
  }

  onDocumentDrop() {
    this.dragOvered.set(false);
  }

  onCardResize(event: ISdResizeEvent) {
    const marginBottom = getComputedStyle(event.target).marginBottom;
    this.cardHeight.set(event.target.clientHeight + (NumberUtils.parseInt(marginBottom) ?? 0));
  }

  onCardDragStart() {
    if (!this.draggable()) return;

    this.heightOnDrag.set(this._elRef.nativeElement.offsetHeight);
    this._boardControl.dragKanban.set(this);
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
}
