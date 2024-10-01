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
import { $computed } from "../utils/$hooks";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";
import { injectElementRef } from "../utils/injectElementRef";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { ISdResizeEvent } from "../plugins/SdResizeEventPlugin";
import { $hostBinding } from "../utils/$hostBinding";
import { $reactive } from "../utils/$reactive";

@Component({
  selector: "sd-kanban",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCardControl, SdEventsDirective],
  //region styles
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

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
      [style.height]="cardHeight$.value + 'px'"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDragDrop($event)"
    ></div>
    <div
      class="_drop-position"
      [style.height]="dragOvered$.value ? (dragKanban$.value?.heightOnDrag$?.value ?? 0) + 'px' : '0px'"
      [style.display]="dragKanban$.value ? 'block' : 'none'"
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
})
export class SdKanbanControl<L, T> {
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));
  #laneControl = inject<SdKanbanLaneControl<L, T>>(forwardRef(() => SdKanbanLaneControl));
  #elRef = injectElementRef();

  value = input.required<T>();

  laneValue$ = $computed(() => this.#laneControl.value());

  selectable = input(false);
  draggable = input(false);

  selected$ = $computed(() => this.#boardControl.selectedValues().includes(this.value()));
  dragKanban$ = $computed(() => this.#boardControl.dragKanban$.value);

  contentClass = input<string>();

  dragOvered$ = $reactive(false);

  heightOnDrag$ = $reactive(0);

  cardHeight$ = $reactive(0);

  constructor() {
    $hostBinding(
      "attr.sd-dragging-this",
      $computed(() => this.dragKanban$.value == this),
    );
    $hostBinding(
      "attr.sd-dragging",
      $computed(() => this.dragKanban$.value != null),
    );
    $hostBinding("attr.sd-drag-over", this.dragOvered$);
  }

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

  onCardResize(event: ISdResizeEvent) {
    const marginBottom = event.entry.target.computedStyleMap().get("margin-bottom") as CSSUnitValue | undefined;
    this.cardHeight$.value = event.entry.target.clientHeight + (marginBottom?.value ?? 0);
  }

  onCardDragStart() {
    if (!this.draggable()) return;

    this.heightOnDrag$.value = this.#elRef.nativeElement.offsetHeight;
    this.#boardControl.dragKanban$.value = this;
  }

  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban$.value == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragOvered$.value = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragOvered$.value = false;
  }

  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban$.value == null) return;
    this.dragOvered$.value = false;

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }

  @HostListener("document:drop.capture")
  onDocumentDrop() {
    this.dragOvered$.value = false;
  }
}
