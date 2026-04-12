import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import {
  SdKanbanBoard,
  type SdKanbanDragRef,
  type SdKanbanDropTarget,
} from "./sd-kanban-board";
import { SdKanbanLane } from "./sd-kanban-lane";
import { SdEvents } from "../../core/events/sd-events";
import type { SdResizeEvent } from "../../core/events/sd-resize-event.plugin";

@Component({
  selector: "sd-kanban",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEvents],
  host: {
    "[attr.data-sd-dragging-this]": "dragKanban() === thisRef",
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
    <div
      class="card"
      [class]="contentClass()"
      [draggable]="draggable()"
      (dragstart)="onCardDragStart()"
      (sdResize)="onCardResize($event)"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
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

          > .card {
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

        > .card {
          white-space: normal;
          user-select: none;
          margin-bottom: var(--gap-lg);
        }
      }
    `,
  ],
})
export class SdKanban<L, T> implements SdKanbanDragRef<L, T>, SdKanbanDropTarget<L, T> {
  private readonly _boardControl = inject<SdKanbanBoard<L, T>>(
    forwardRef(() => SdKanbanBoard),
  );
  private readonly _laneControl = inject<SdKanbanLane<L, T>>(
    forwardRef(() => SdKanbanLane),
  );
  private readonly _elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly thisRef = this;

  value = input<T>();

  laneValue = computed(() => this._laneControl.value());

  selectable = input(false, { transform: booleanAttribute });
  draggable = input(false, { transform: booleanAttribute });

  selected = computed(
    () => this.value() != null && this._boardControl.selectedValues().includes(this.value()!),
  );
  dragKanban = computed(() => this._boardControl.dragKanban());

  contentClass = input<string>();

  dragOvered = signal(false);

  heightOnDrag = signal(0);

  cardHeight = signal(0);

  constructor() {
    afterNextRender(() => {
      const card = this._elRef.nativeElement.querySelector(".card");
      if (card != null) {
        const marginBottom = getComputedStyle(card).marginBottom;
        this.cardHeight.set(card.clientHeight + (parseInt(marginBottom) || 0));
      }
    });
  }

  targetLaneValue() {
    return this._laneControl.value();
  }

  targetKanbanValue() {
    return this.value();
  }

  onHostClick(event: MouseEvent) {
    if (event.shiftKey) {
      if (!this.selectable()) return;
      if (this.value() == null) return;

      event.preventDefault();
      event.stopPropagation();

      this._boardControl.selectedValues.update((v) => {
        const r = [...v];
        if (v.includes(this.value()!)) {
          return r.filter((item) => item !== this.value());
        } else {
          r.push(this.value()!);
          return r;
        }
      });
    }
  }

  onDocumentDrop() {
    this.dragOvered.set(false);
  }

  onCardResize(event: SdResizeEvent) {
    const marginBottom = getComputedStyle(event.target as HTMLElement).marginBottom;
    this.cardHeight.set(
      (event.target as HTMLElement).clientHeight + (parseInt(marginBottom) || 0),
    );
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
