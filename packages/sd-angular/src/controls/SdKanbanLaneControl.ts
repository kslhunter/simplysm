import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  forwardRef,
  HostListener,
  inject,
  input,
  output,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed, $model, $signal } from "../utils/$hooks";
import { SdKanbanBoardControl } from "./SdKanbanBoardControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";

/**
 * 칸반 레인 컨트롤
 * 
 * 칸반 보드 내에서 하나의 열을 구성하는 컴포넌트입니다.
 * 
 * @template L 레인 값의 타입
 * @template T 칸반 아이템 값의 타입
 * 
 * @example
 * ```html
 * <sd-kanban-board>
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
  selector: "sd-kanban-lane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdCheckboxControl,
    NgTemplateOutlet,
    SdDockContainerControl,
    SdDockControl,
    SdPaneControl,
    SdAnchorControl,
    SdIconControl,

  ],
  //region styles
  styles: [
    /* language=SCSS */ `
      sd-kanban-lane {
        > sd-dock-container > sd-pane {
          > sd-busy-container {
            padding: var(--gap-xl) var(--gap-lg);
            background: var(--theme-grey-lightest);
            border-radius: var(--border-radius-default);
            //overflow: hidden;
            height: 100%;

            > ._drop-position {
              pointer-events: none;
              border-radius: var(--border-radius-default);
              background: var(--trans-light);

              height: 0;
              margin-bottom: 0;
              visibility: hidden;
              transition: 0.1s linear;
              transition-property: height, margin-bottom, visibility;
            }
          }
        }

        &[sd-drag-over="true"] {
          > sd-dock-container > sd-pane > sd-busy-container > ._drop-position {
            margin-bottom: var(--gap-lg);
            visibility: visible;
          }
        }
      }
    `,
  ],
  //endregion
  template: `
    <sd-dock-container>
      @if (useCollapse() || titleTemplateRef()) {
        <sd-dock class="p-default pb-0">
          @if (useCollapse()) {
            <sd-anchor theme="info" (click)="onToggleCollapseButtonClick()">
              <sd-icon [icon]="collapse() ? icons.eyeSlash : icons.eye" fixedWidth />
            </sd-anchor>
          }

          @if (titleTemplateRef()) {
            <div style="display: inline-block;" class="pl-default">
              <ng-template [ngTemplateOutlet]="titleTemplateRef() ?? null" />
            </div>
          }
        </sd-dock>
      }

      <sd-pane class="p-default">
        <sd-busy-container [busy]="busy()" style="min-height: 3em" type="bar">
          @if (kanbanControls().length > 0 || toolsTemplateRef()) {
            <div class="tx-center mb-xl">
              @if (kanbanControls().length > 0) {
                <sd-checkbox
                  style="float: left"
                  [inline]="true"
                  theme="white"
                  [value]="isAllSelected()"
                  (valueChange)="onSelectAllButtonClick($event)"
                />
              }
              <ng-template [ngTemplateOutlet]="toolsTemplateRef() ?? null" />
            </div>
          }

          @if (!collapse()) {
            <ng-content></ng-content>
          }

          <div
            class="_drop-position"
            [style.height]="dragOvered() ? (dragKanban()?.heightOnDrag() ?? 0) + 'px' : '0px'"
            [style.display]="dragKanban() ? 'block' : 'none'"
          ></div>
        </sd-busy-container>
      </sd-pane>
    </sd-dock-container>
  `,
  host: {
    "[attr.sd-drag-over]": "dragOvered()",
  },
})
export class SdKanbanLaneControl<L, T> {
  /** Font Awesome 아이콘 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 칸반 보드 컨트롤 인스턴스 */
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  /** 로딩 상태 */
  busy = input(false, { transform: transformBoolean });

  /** 접기/펼치기 기능 사용 여부 */
  useCollapse = input(false, { transform: transformBoolean });

  /** 접힘 상태 */
  _collapse = input(false, { alias: "collapse", transform: transformBoolean });
  /** 접힘 상태 변경 이벤트 */
  _collapseChange = output<boolean>({ alias: "collapseChange" });
  /** 접힘 상태 양방향 바인딩 */
  collapse = $model(this._collapse, this._collapseChange);

  /** 레인 값 */
  value = input.required<L>();

  /** 레인에 포함된 칸반 아이템 컨트롤 목록 */
  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  /** 도구 영역 템플릿 */
  toolsTemplateRef = contentChild<any, TemplateRef<void>>("toolsTemplate", { read: TemplateRef });
  /** 제목 영역 템플릿 */
  titleTemplateRef = contentChild<any, TemplateRef<void>>("titleTemplate", { read: TemplateRef });

  /** 모든 칸반 아이템이 선택되었는지 여부 */
  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  /** 현재 드래그 중인 칸반 아이템 */
  dragKanban = $computed(() => this.#boardControl.dragKanban());

  /** 드래그 오버 상태 여부 */
  dragOvered = $signal(false);

  /** 접기/펼치기 버튼 클릭 이벤트 핸들러 */
  onToggleCollapseButtonClick() {
    this.collapse.update((v) => !v);
  }

  /** 전체 선택/해제 버튼 클릭 이벤트 핸들러 */
  onSelectAllButtonClick(val: boolean) {
    if (val) {
      for (const ctrl of this.kanbanControls()) {
        this.#boardControl.selectedValues.update((v) => {
          if (!v.includes(ctrl.value())) {
            return [...v, ctrl.value()];
          }
          return v;
        });
      }
    }
    else {
      for (const ctrl of this.kanbanControls()) {
        this.#boardControl.selectedValues.update((v) => {
          if (v.includes(ctrl.value())) {
            return v.filter((item) => item !== ctrl.value());
          }
          return v;
        });
      }
    }
  }

  // #timeout?: NodeJS.Timeout;

  /** 드래그 오버 이벤트 핸들러 */
  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    // if (this.#timeout != null) {
    //   clearTimeout(this.#timeout);
    // }
    this.dragOvered.set(true);
  }

  /** 드래그 리브 이벤트 핸들러 */
  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // this.#timeout = setTimeout(() => {
    //   this.dragOvered.set(false);
    // }, 25);

    this.dragOvered.set(false);
  }

  /** 드래그 드롭 이벤트 핸들러 */
  @HostListener("drop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }
}
