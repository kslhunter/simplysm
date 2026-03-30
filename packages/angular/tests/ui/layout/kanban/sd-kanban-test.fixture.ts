import { Component, viewChild } from "@angular/core";
import { SdKanbanBoardControl } from "../../../../src/ui/layout/kanban/sd-kanban-board.control";
import { SdKanbanLaneControl } from "../../../../src/ui/layout/kanban/sd-kanban-lane.control";
import { SdKanbanControl } from "../../../../src/ui/layout/kanban/sd-kanban.control";

@Component({
  selector: "sd-kanban-board-test-horizontal",
  standalone: true,
  imports: [SdKanbanBoardControl],
  template: `
    <sd-kanban-board>
      <div class="lane">Lane 1</div>
      <div class="lane">Lane 2</div>
      <div class="lane">Lane 3</div>
    </sd-kanban-board>
  `,
})
export class SdKanbanBoardTestHorizontal {}

@Component({
  selector: "sd-kanban-drag-drop-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board (drop)="onDrop($event)">
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'A'" [draggable]="true">Card A</sd-kanban>
      </sd-kanban-lane>
      <sd-kanban-lane [value]="'lane2'">
        <sd-kanban [value]="'B'" [draggable]="true">Card B</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanDragDropTest {
  board = viewChild.required(SdKanbanBoardControl);
  dropInfo: any = null;

  onDrop(event: any) {
    this.dropInfo = event;
  }
}

@Component({
  selector: "sd-kanban-select-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board [(selectedValues)]="selectedValues">
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'A'" [selectable]="true">Card A</sd-kanban>
        <sd-kanban [value]="'B'" [selectable]="true">Card B</sd-kanban>
        <sd-kanban [selectable]="true">Card No Value</sd-kanban>
        <sd-kanban [value]="'D'" [selectable]="false">Card D not selectable</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanSelectTest {
  selectedValues: string[] = [];
}

@Component({
  selector: "sd-kanban-lane-drop-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board (drop)="onDrop($event)">
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'A'" [draggable]="true">Card A</sd-kanban>
      </sd-kanban-lane>
      <sd-kanban-lane [value]="'lane2'">
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneDropTest {
  board = viewChild.required(SdKanbanBoardControl);
  dropInfo: any = null;

  onDrop(event: any) {
    this.dropInfo = event;
  }
}

@Component({
  selector: "sd-kanban-lane-select-all-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board [(selectedValues)]="selectedValues">
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'X'" [selectable]="true">Card X</sd-kanban>
        <sd-kanban [value]="'Y'" [selectable]="true">Card Y</sd-kanban>
        <sd-kanban [value]="'Z'" [selectable]="true">Card Z</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneSelectAllTest {
  selectedValues: string[] = [];
}

@Component({
  selector: "sd-kanban-lane-no-selectable-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board>
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'A'" [selectable]="false">Card A</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneNoSelectableTest {}

@Component({
  selector: "sd-kanban-lane-collapse-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board>
      <sd-kanban-lane [value]="'lane1'" [useCollapse]="true" [(collapse)]="collapsed">
        <sd-kanban [value]="'A'">Card A</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneCollapseTest {
  collapsed = false;
}

@Component({
  selector: "sd-kanban-lane-no-collapse-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board>
      <sd-kanban-lane [value]="'lane1'" [useCollapse]="false">
        <sd-kanban [value]="'A'">Card A</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneNoCollapseTest {}

@Component({
  selector: "sd-kanban-lane-mixed-selectable-test",
  standalone: true,
  imports: [SdKanbanBoardControl, SdKanbanLaneControl, SdKanbanControl],
  template: `
    <sd-kanban-board [(selectedValues)]="selectedValues">
      <sd-kanban-lane [value]="'lane1'">
        <sd-kanban [value]="'X'" [selectable]="true">Card X</sd-kanban>
        <sd-kanban [value]="'Y'" [selectable]="true">Card Y</sd-kanban>
        <sd-kanban [value]="'Z'" [selectable]="false">Card Z not selectable</sd-kanban>
      </sd-kanban-lane>
    </sd-kanban-board>
  `,
})
export class SdKanbanLaneMixedSelectableTest {
  lane = viewChild.required(SdKanbanLaneControl);
  selectedValues: string[] = [];
}
