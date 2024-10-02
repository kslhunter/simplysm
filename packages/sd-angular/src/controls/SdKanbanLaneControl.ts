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
  ViewEncapsulation
} from "@angular/core";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdKanbanControl } from "./SdKanbanControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed, $signal } from "../utils/$hooks";
import { SdKanbanBoardControl } from "./SdKanbanBoardControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";

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
    FaIconComponent,
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
              <fa-icon [icon]="collapse() ? icons.eyeSlash : icons.eye" [fixedWidth]="true" />
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
  icons = inject(SdAngularConfigProvider).icons;

  #boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  busy = input(false);

  useCollapse = input(false);
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
      for (const ctrl of this.kanbanControls()) {
        this.#boardControl.selectedValues.update((v) => {
          if (!v.includes(ctrl.value())) {
            return [...v, ctrl.value()];
          }
          return v;
        });
      }
    } else {
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

  #timeout?: NodeJS.Timeout;

  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this.#boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.#timeout != null) {
      clearTimeout(this.#timeout);
    }
    this.dragOvered.set(true);
  }

  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.#timeout = setTimeout(() => {
      this.dragOvered.set(false);
    }, 25);
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
