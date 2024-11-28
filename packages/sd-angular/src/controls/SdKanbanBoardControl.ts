import { ChangeDetectionStrategy, Component, HostListener, input, output, ViewEncapsulation } from "@angular/core";
import { $model, $signal } from "../utils/$hooks";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";


/**
 * 칸반 보드 컨트롤
 * 
 * 칸반 보드를 구성하는 컨테이너 컴포넌트입니다.
 * 
 * @template L 레인 값의 타입
 * @template T 칸반 아이템 값의 타입
 * 
 * @example
 * ```html
 * <sd-kanban-board
 *   [(selectedValues)]="selectedItems"
 *   (drop)="onKanbanDrop($event)">
 *   <sd-kanban-lane [value]="'todo'" title="할 일">
 *     <sd-kanban *ngFor="let item of todoItems"
 *                [value]="item"
 *                [laneValue]="'todo'">
 *       {{item.title}}
 *     </sd-kanban>
 *   </sd-kanban-lane>
 *   <sd-kanban-lane [value]="'doing'" title="진행 중">
 *     <sd-kanban *ngFor="let item of doingItems"
 *                [value]="item"
 *                [laneValue]="'doing'">
 *       {{item.title}}
 *     </sd-kanban>
 *   </sd-kanban-lane>
 * </sd-kanban-board>
 * ```
 */
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
  /** 현재 드래그 중인 칸반 아이템 */
  dragKanban = $signal<SdKanbanControl<L, T>>();

  // selectedKanbanSet = $signalSet<SdKanbanControl<T>>();

  /** 선택된 칸반 아이템 값 목록 */
  _selectedValues = input<T[]>([], { alias: "selectedValues" });
  /** 선택된 칸반 아이템 값 목록 변경 이벤트 */
  _selectedValuesChange = output<T[]>({ alias: "selectedValuesChange" });
  /** 선택된 칸반 아이템 값 목록 양방향 바인딩 */
  selectedValues = $model(this._selectedValues, this._selectedValuesChange);

  /** 칸반 아이템 드롭 이벤트 */
  drop = output<ISdKanbanBoardDropInfo<L, T>>();

  /**
   * 칸반 아이템을 대상 위치에 드롭했을 때 호출되는 메서드
   * @param target 드롭 대상 (칸반 아이템 또는 레인)
   */
  onDropTo(target: SdKanbanControl<L, T> | SdKanbanLaneControl<L, T>) {
    if (!this.dragKanban()) return;

    this.drop.emit({
      sourceKanbanValue: this.dragKanban()!.value(),
      targetLaneValue: target instanceof SdKanbanControl ? target.laneValue() : target.value(),
      targetKanbanValue: target instanceof SdKanbanControl ? target.value() : undefined,
    });

    this.dragKanban.set(undefined);
  }

  /** 문서 전체에서 드래그가 종료되었을 때 호출되는 메서드 */
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
