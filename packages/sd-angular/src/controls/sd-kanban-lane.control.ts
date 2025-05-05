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
import { SdBusyContainerControl } from "./sd-busy-container.control";
import { SdKanbanControl } from "./sd-kanban.control";
import { SdCheckboxControl } from "./sd-checkbox.control";
import { $computed, $model, $signal } from "../utils/hooks/hooks";
import { SdKanbanBoardControl } from "./sd-kanban-board.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockContainerControl } from "./sd-dock-container.control";
import { SdDockControl } from "./sd-dock.control";
import { SdPaneControl } from "./sd-pane.control";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { transformBoolean } from "../utils/type-tramsforms";
import { SdIconControl } from "./sd-icon.control";

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
        > sd-dock-container > ._content > sd-pane {
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
          > sd-dock-container > ._content > sd-pane > sd-busy-container > ._drop-position {
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
  protected icons = inject(SdAngularConfigProvider).icons;

  private _boardControl = inject<SdKanbanBoardControl<L, T>>(forwardRef(() => SdKanbanBoardControl));

  busy = input(false, { transform: transformBoolean });

  useCollapse = input(false, { transform: transformBoolean });

  __collapse = input(false, { alias: "collapse", transform: transformBoolean });
  __collapseChange = output<boolean>({ alias: "collapseChange" });
  collapse = $model(this.__collapse, this.__collapseChange);

  value = input.required<L>();

  kanbanControls = contentChildren<SdKanbanControl<L, T>>(SdKanbanControl, { descendants: true });

  toolsTemplateRef = contentChild<any, TemplateRef<void>>("toolsTemplate", { read: TemplateRef });
  titleTemplateRef = contentChild<any, TemplateRef<void>>("titleTemplate", { read: TemplateRef });

  isAllSelected = $computed(() => this.kanbanControls().every((ctrl) => ctrl.selected()));

  dragKanban = $computed(() => this._boardControl.dragKanban());

  dragOvered = $signal(false);

  onToggleCollapseButtonClick() {
    this.collapse.update((v) => !v);
  }

  onSelectAllButtonClick(val: boolean) {
    if (val) {
      this._boardControl.selectedValues.update((v) => {
        const r = [...v];
        for (const ctrl of this.kanbanControls()) {
          if (!v.includes(ctrl.value())) {
            r.push(ctrl.value());
          }
        }
        return r.length === v.length ? v : r;
      });
    }
    else {
      this._boardControl.selectedValues.update((v) => {
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

  // #timeout?: NodeJS.Timeout;

  @HostListener("dragover", ["$event"])
  onDragOver(event: DragEvent) {
    if (this._boardControl.dragKanban() == null) return;

    event.preventDefault();
    event.stopPropagation();

    // if (this.#timeout != null) {
    //   clearTimeout(this.#timeout);
    // }
    this.dragOvered.set(true);
  }

  @HostListener("dragleave", ["$event"])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // this.#timeout = setTimeout(() => {
    //   this.dragOvered.set(false);
    // }, 25);

    this.dragOvered.set(false);
  }

  @HostListener("drop", ["$event"])
  onDragDrop(event: DragEvent) {
    if (this._boardControl.dragKanban() == null) return;
    this.dragOvered.set(false);

    event.preventDefault();
    event.stopPropagation();

    this._boardControl.onDropTo(this);
  }
}
