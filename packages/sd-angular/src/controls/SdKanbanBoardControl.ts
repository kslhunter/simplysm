import { ChangeDetectionStrategy, Component, HostListener, model, output, ViewEncapsulation } from "@angular/core";
import { $reactive } from "../utils/$reactive";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";

@Component({
  selector: "sd-kanban-board",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  //region styles
  styles: [
    /* language=SCSS */ `
      sd-kanban-board {
        display: inline-flex;
        flex-wrap: nowrap;
        flex-direction: row;
        white-space: nowrap;
        gap: var(--gap-xxl);
        height: 100%;
      }
    `,
  ],
  //endregion
  template: `
    <ng-content></ng-content>
  `,
})
export class SdKanbanBoardControl<L, T> {
  dragKanban$ = $reactive<SdKanbanControl<L, T>>();

  selectedValues = model<T[]>([]);

  drop = output<ISdKanbanBoardDropInfo<L, T>>();

  onDropTo(target: SdKanbanControl<L, T> | SdKanbanLaneControl<L, T>) {
    if (!this.dragKanban$.value) return;

    this.drop.emit({
      sourceKanbanValue: this.dragKanban$.value.value(),
      targetLaneValue: target instanceof SdKanbanControl ? target.laneValue$.value : target.value(),
      targetKanbanValue: target instanceof SdKanbanControl ? target.value() : undefined,
    });

    this.dragKanban$.value = undefined;
  }

  @HostListener("document:dragend")
  onDocumentDragEnd() {
    this.dragKanban$.value = undefined;
  }
}

export interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue: T;
  targetLaneValue: L;
  targetKanbanValue?: T;
}
