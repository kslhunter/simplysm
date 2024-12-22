import { ChangeDetectionStrategy, Component, HostListener, input, output, ViewEncapsulation } from "@angular/core";
import { $model, $signal } from "../utils/hooks";
import { SdKanbanControl } from "./sd-kanban.control";
import { SdKanbanLaneControl } from "./sd-kanban-lane.control";

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
  dragKanban = $signal<SdKanbanControl<L, T>>();

  // selectedKanbanSet = $signalSet<SdKanbanControl<T>>();

  _selectedValues = input<T[]>([], { alias: "selectedValues" });
  _selectedValuesChange = output<T[]>({ alias: "selectedValuesChange" });
  selectedValues = $model(this._selectedValues, this._selectedValuesChange);


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
