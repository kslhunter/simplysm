import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  forwardRef,
  HostListener,
  inject,
  input,
  model,
  TemplateRef,
  ViewEncapsulation,
} from "@angular/core";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/bindings/$computed";
import { $signal } from "../utils/bindings/$signal";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdBusyContainerControl } from "./sd-busy-container.control";
import { SdCheckboxControl } from "./sd-checkbox.control";

import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { SdKanbanControl } from "./sd-kanban.control";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdFlexControl } from "./flex/sd-flex.control";
import { SdFlexItemControl } from "./flex/sd-flex-item.control";

@Component({
  selector: "sd-kanban-lane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdCheckboxControl,
    NgTemplateOutlet,
    SdAnchorControl,
    FaIconComponent,
    SdFlexControl,
    SdFlexItemControl,
  ],
  template: `
    <sd-flex vertical padding="default" gap="default">
      @if (useCollapse() || titleTemplateRef()) {
        <sd-flex-item>
          @if (useCollapse()) {
            <sd-anchor theme="info" (click)="onToggleCollapseButtonClick()">
              <fa-icon [icon]="collapse() ? icons.eyeSlash : icons.eye" [fixedWidth]="true" />
            </sd-anchor>
          }

          @if (titleTemplateRef()) {
            <div style="display: inline-block;" class="pl-default">
              <ng-template [ngTemplateOutlet]="titleTemplateRef() ?? null" />
            </div>
          }
        </sd-flex-item>
      }

      <sd-flex-item fill>
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
      </sd-flex-item>
    </sd-flex>
  `,
  styles: [
    /* language=SCSS */ `
      sd-kanban-lane {
        > sd-flex > sd-flex-item[fill] {
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
          > sd-flex > sd-flex-item[fill] > sd-busy-container > ._drop-position {
            margin-bottom: var(--gap-lg);
            visibility: visible;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-drag-over]": "dragOvered()",
  },
})
export class SdKanbanLaneControl<L, T> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  busy = input(false, { transform: transformBoolean });

  useCollapse = input(false, { transform: transformBoolean });

  collapse = model(false);

  value = input.required<L>();

  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  toolsTemplateRef = contentChild<any, TemplateRef<void>>("toolsTemplate", { read: TemplateRef });
  titleTemplateRef = contentChild<any, TemplateRef<void>>("titleTemplate", { read: TemplateRef });

  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  dragKanban = $computed(() => this.#boardControl.dragKanban());

  dragOvered = $signal(false);

  onToggleCollapseButtonClick() {
    this.collapse.update((v) => !v);
  }

  onSelectAllButtonClick(val: boolean) {
    if (val) {
      this.#boardControl.selectedValues.update((v) => {
        const r = [...v];
        for (const ctrl of this.kanbanControls()) {
          if (!v.includes(ctrl.value())) {
            r.push(ctrl.value());
          }
        }
        return r.length === v.length ? v : r;
      });
    } else {
      this.#boardControl.selectedValues.update((v) => {
        const r = [...v];
        for (const ctrl of this.kanbanControls()) {
          if (v.includes(ctrl.value())) {
            r.remove((item) => item === ctrl.value());
          }
        }
        return r.length === v.length ? v : r;
      });
    }
  }

  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(true);
  }

  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragOvered.set(false);
  }

  @HostListener("drop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this.#boardControl.onDropTo(this);
  }
}
