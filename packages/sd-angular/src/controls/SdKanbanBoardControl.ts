import { ChangeDetectionStrategy, Component, HostListener, input, output, ViewEncapsulation } from "@angular/core";
import { $model, $signal } from "../utils/$hooks";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";

/**
 * 칸반 보드 컴포넌트
 * 
 * 칸반 보드를 구성하는 최상위 컴포넌트입니다. 여러 개의 레인과 칸반 아이템을 포함할 수 있습니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-kanban-board>
 *   <sd-kanban-lane [value]="'todo'" [title]="'할 일'">
 *     <sd-kanban [value]="item1" [laneValue]="'todo'">항목 1</sd-kanban>
 *     <sd-kanban [value]="item2" [laneValue]="'todo'">항목 2</sd-kanban>
 *   </sd-kanban-lane>
 *   <sd-kanban-lane [value]="'doing'" [title]="'진행 중'">
 *     <sd-kanban [value]="item3" [laneValue]="'doing'">항목 3</sd-kanban>
 *   </sd-kanban-lane>
 * </sd-kanban-board>
 * 
 * <!-- 선택 기능 사용 -->
 * <sd-kanban-board [(selectedValues)]="selectedItems">
 *   ...
 * </sd-kanban-board>
 * ```
 * 
 * @remarks
 * - 드래그 앤 드롭을 통해 칸반 아이템을 다른 레인으로 이동할 수 있습니다
 * - 칸반 아이템의 선택 기능을 제공합니다
 * - 레인과 칸반 아이템은 제네릭 타입을 통해 다양한 데이터 타입을 지원합니다
 * - 가로 스크롤이 가능한 레이아웃을 제공합니다
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
