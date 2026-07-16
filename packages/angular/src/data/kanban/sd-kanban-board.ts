import {
  ChangeDetectionStrategy,
  Component,
  model,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-kanban-board",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "(document:dragend)": "onDocumentDragEnd()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-kanban-board {
        display: inline-flex;
        flex-wrap: nowrap;
        white-space: nowrap;
        height: 100%;
        @include mixins.flex-direction(row, var(--sd-gap-lg));
      }
    `,
  ],
})
export class SdKanbanBoard<L, T> {
  dragKanban = signal<SdKanbanDragRef<L, T> | undefined>(undefined);

  selectedValues = model<T[]>([]);

  drop = output<SdKanbanBoardDropInfo<L, T>>();

  onDropTo(target: SdKanbanDropTarget<L, T>) {
    if (this.dragKanban() == null) return;

    this.drop.emit({
      sourceKanbanValue: this.dragKanban()!.value(),
      targetLaneValue: target.targetLaneValue(),
      targetKanbanValue: target.targetKanbanValue?.(),
    });

    this.dragKanban.set(undefined);
  }

  onDocumentDragEnd() {
    this.dragKanban.set(undefined);
  }
}

export interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}

export interface SdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}

export interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
