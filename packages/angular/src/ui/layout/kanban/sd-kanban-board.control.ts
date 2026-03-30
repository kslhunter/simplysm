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
      @use "../../../../scss/commons/mixins";

      sd-kanban-board {
        display: inline-flex;
        flex-wrap: nowrap;
        white-space: nowrap;
        height: 100%;
        @include mixins.flex-direction(row, var(--gap-lg));
      }
    `,
  ],
})
export class SdKanbanBoardControl<L, T> {
  dragKanban = signal<ISdKanbanDragRef<L, T> | undefined>(undefined);

  selectedValues = model<T[]>([]);

  drop = output<ISdKanbanBoardDropInfo<L, T>>();

  onDropTo(target: ISdKanbanDropTarget<L, T>) {
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

export interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}

export interface ISdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}

export interface ISdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
