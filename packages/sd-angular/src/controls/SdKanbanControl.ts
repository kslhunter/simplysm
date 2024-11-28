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
import { $computed, $signal } from "../utils/$hooks";
import { SdKanbanLaneControl } from "./SdKanbanLaneControl";
import { injectElementRef } from "../utils/injectElementRef";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { ISdResizeEvent } from "../plugins/SdResizeEventPlugin";
import { NumberUtil } from "@simplysm/sd-core-common";
import { transformBoolean } from "../utils/transforms";

/**
 * 칸반 아이템 컨트롤
 * 
 * 칸반 보드 내에서 드래그 앤 드롭이 가능한 아이템 컴포넌트입니다.
 * 
 * @template L 레인 값의 타입
 * @template T 칸반 아이템 값의 타입
 * 
 * @example
 * ```html
 * <sd-kanban-board>
 *   <sd-kanban-lane [value]="'todo'" title="할 일">
 *     <sd-kanban [value]="item" 
 *                [laneValue]="'todo'"
 *                [selected]="true">
 *       {{item.title}}
 *     </sd-kanban>
 *   </sd-kanban-lane>
 * </sd-kanban-board>
 * ```
 */
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
          > sd-card {
            pointer-events: none;
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
      [style.height]="cardHeight() + 'px'"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDragDrop($event)"
    ></div>
    <div
      class="_drop-position"
      [style.height]="dragOvered() ? (dragKanban()?.heightOnDrag() ?? 0) + 'px' : '0px'"
      [style.display]="dragKanban() ? 'block' : 'none'"
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
  host: {
    "[attr.sd-dragging-this]": "dragKanban() === this",
    "[attr.sd-dragging]": "dragKanban() != null",
    "[attr.sd-drag-over]": "dragOvered()",
  },
})
export class SdKanbanControl<L, T> {
  /** 칸반 보드 컨트롤 인스턴스 */
  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));
  /** 칸반 레인 컨트롤 인스턴스 */
  #laneControl = inject<SdKanbanLaneControl<L, T>>(forwardRef(() => SdKanbanLaneControl));
  /** 엘리먼트 참조 */
  #elRef = injectElementRef();

  /** 칸반 아이템의 값 */
  value = input.required<T>();

  /** 현재 칸반이 속한 레인의 값 */
  laneValue = $computed(() => this.#laneControl.value());

  /** 선택 가능 여부 */
  selectable = input(false, { transform: transformBoolean });
  /** 드래그 가능 여부 */
  draggable = input(false, { transform: transformBoolean });

  /** 현재 칸반이 선택되었는지 여부 */
  selected = $computed(() => this.#boardControl.selectedValues().includes(this.value()));
  /** 현재 드래그 중인 칸반 */
  dragKanban = $computed(() => this.#boardControl.dragKanban());

  /** 컨텐츠에 적용할 클래스 */
  contentClass = input<string>();

  /** 드래그 오버 상태 여부 */
  dragOvered = $signal(false);

  /** 드래그 중일 때의 높이 */
  heightOnDrag = $signal(0);

  /** 카드의 높이 */
  cardHeight = $signal(0);

  /**
   * 클릭 이벤트 핸들러
   * - Shift 키와 함께 클릭 시 선택 상태를 토글
   */
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
        }
        else {
          r.push(this.value());
        }
        return r;
      });
    }
  }

  /**
   * 카드 크기 변경 이벤트 핸들러
   * - 카드의 실제 높이를 계산하여 저장
   */
  onCardResize(event: ISdResizeEvent) {
    const marginBottom = getComputedStyle(event.entry.target).marginBottom;
    this.cardHeight.set(event.entry.target.clientHeight + (NumberUtil.parseInt(marginBottom) ?? 0));
  }

  /**
   * 카드 드래그 시작 이벤트 핸들러
   * - 드래그 가능한 경우에만 드래그 상태 설정
   */
  onCardDragStart() {
    if (!this.draggable()) return;

    this.heightOnDrag.set(this.#elRef.nativeElement.offsetHeight);
    this.#boardControl.dragKanban.set(this);
  }

  /**
   * 드래그 오버 이벤트 핸들러
   * - 드래그 중인 칸반이 있을 때만 드래그 오버 상태 설정
   */
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(true);
  }

  /**
   * 드래그 리브 이벤트 핸들러
   * - 드래그 오버 상태 해제
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(false);
  }

  /**
   * 드래그 드롭 이벤트 핸들러
   * - 드래그 중인 칸반이 있을 때만 드롭 처리
   */
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }

  /**
   * 문서 드롭 이벤트 핸들러
   * - 드래그 오버 상태 해제
   */
  @HostListener("document:drop.capture")
  onDocumentDrop() {
    this.dragOvered.set(false);
  }
}
