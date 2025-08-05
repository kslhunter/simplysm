import { ChangeDetectionStrategy, Component, HostListener, model, output, ViewEncapsulation } from "@angular/core";
import { $signal } from "../../utils/bindings/$signal";
import { SdKanbanLaneControl } from "./sd-kanban-lane.control";
import { SdKanbanControl } from "./sd-kanban.control";

@Component({
  selector: "sd-kanban-board",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
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
})
export class SdKanbanBoardControl<L, T> {
  dragKanban = $signal<SdKanbanControl<L, T>>();

  // selectedKanbanSet = $signalSet<SdKanbanControl<T>>();

  selectedValues = model<T[]>([]);

  drop = output<ISdKanbanBoardDropInfo<L, T>>();

  onDropTo(target: SdKanbanControl<L, T> | SdKanbanLaneControl<L, T>) {
    if (!this.dragKanban()) return;

    this.drop.emit({
      sourceKanbanValue: this.dragKanban()!.value(),
      targetLaneValue: target instanceof SdKanbanControl ? target.laneValue() : target.value(),
      targetKanbanValue: target instanceof SdKanbanControl ? target.value() : undefined,
    });

    this.dragKanban.set(undefined);
  }

  @HostListener("document:dragend")
  onDocumentDragEnd() {
    this.dragKanban.set(undefined);
  }
}

export interface ISdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue: T;
  targetLaneValue: L;
  targetKanbanValue?: T;
}
