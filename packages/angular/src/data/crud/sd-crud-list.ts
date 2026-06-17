import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  type TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdActivatedModalProvider } from "../../core/modal/sd-activated-modal.provider";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdButton } from "../../controls/button/sd-button";
import { SdCommandDirective } from "../../core/commands/sd-command";
import { SdForm } from "../../controls/form/sd-form";
import { SdSheet } from "../sheet/sd-sheet";
import { SdSheetColumn } from "../sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../sheet/sd-sheet-column-cell-template";
import type { SdViewType } from "../../core/routing/injectViewTypeSignal";
import type { SortingDef } from "../../core/selection/useSortingManager";
import { SdBaseContainer } from "./sd-base-container";
import { NgIcon } from "@ng-icons/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  tablerCirclePlus,
  tablerDeviceFloppy,
  tablerEraser,
  tablerRestore,
  tablerSearch,
} from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-crud-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainer,
    SdButton,
    NgIcon,
    NgTemplateOutlet,
    SdSheet,
    SdForm,
    SdAnchor,
    SdSheetColumn,
    SdSheetColumnCellTemplate,
  ],
  hostDirectives: [{ directive: SdCommandDirective, outputs: ["sdSaveCommand"] }],
  host: {
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  template: `
    <sd-base-container
      [(ready)]="ready"
      [initialized]="initialized()"
      [(busyCount)]="busyCount"
      [restricted]="restricted()"
      [viewType]="viewType()"
    >
      <!-- TOP -->
      @if (viewType() === "page" && (inlineEditEnabled() || commandTplRef())) {
        <ng-template #topbarTpl>
          @if (inlineEditEnabled()) {
            <sd-button [theme]="'link-primary'" (click)="formCtrl()?.requestSubmit()">
              <ng-icon [svg]="tablerDeviceFloppy" />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
          }

          <ng-template [ngTemplateOutlet]="commandTplRef()" />
        </ng-template>
      } @else if (inlineEditEnabled() || commandTplRef()) {
        <ng-template #commandTpl>
          @if (inlineEditEnabled()) {
            <sd-button [theme]="'primary'" (click)="onSaveButtonClick()">
              <ng-icon [svg]="tablerDeviceFloppy" />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
          }

          <ng-template [ngTemplateOutlet]="commandTplRef()" />
        </ng-template>
      }

      <!-- BOTTOM -->
      @if ((viewType() === "modal" && selectMode() != null) || bottomCommandTplRef()) {
        <ng-template #bottomCommandTpl>
          @if (bottomCommandTplRef()) {
            <div class="flex-fill flex-row main-align-start gap-sm">
              <ng-template [ngTemplateOutlet]="bottomCommandTplRef()" />
            </div>
          }

          @if (selectMode() != null) {
            <sd-button
              [size]="'sm'"
              [theme]="'danger'"
              (click)="onModalSelectionCancelClick()"
              [disabled]="selectedKeys().length < 1"
            >
              선택 해제
            </sd-button>
            @if (selectMode() === "multi") {
              <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalSelectionConfirmClick()">
                확인({{ selectedKeys().length }})
              </sd-button>
            }
          }
        </ng-template>
      }

      <ng-template #contentTpl>
        <div class="flex-column fill">
          @if (filterTplRef()) {
            <sd-form (formSubmit)="filterSubmit.emit()" class="block p-default">
              <div class="form-box-inline">
                <div>
                  <sd-button [type]="'submit'" [theme]="'info'">
                    <ng-icon [svg]="tablerSearch" />
                    조회
                  </sd-button>
                </div>
                <ng-template [ngTemplateOutlet]="filterTplRef()" />
              </div>
            </sd-form>
          }

          @if (canCreate() || canDelete() || toolTplRef()) {
            <div class="flex-row gap-sm p-xs-default">
              @if (canCreate()) {
                <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="create.emit()">
                  <ng-icon [svg]="tablerCirclePlus" />
                  등록
                </sd-button>
              }
              @if (canDelete() && selectMode() !== "single") {
                <sd-button
                  [size]="'sm'"
                  [theme]="'link-danger'"
                  (click)="delete.emit(currSelectedItems())"
                  [disabled]="!hasSelectedNotDeleted()"
                >
                  <ng-icon [svg]="tablerEraser" />
                  선택 삭제
                </sd-button>
                @if (hasSelectedDeleted()) {
                  <sd-button
                    [size]="'sm'"
                    [theme]="'link-warning'"
                    (click)="restore.emit(currSelectedItems())"
                  >
                    <ng-icon [svg]="tablerRestore" />
                    선택 복구
                  </sd-button>
                }
              }

              @if (toolTplRef()) {
                <ng-template [ngTemplateOutlet]="toolTplRef()" />
              }
            </div>
          }

          @if (inlineEditEnabled()) {
            <sd-form #formCtrl (formSubmit)="submit.emit()" class="flex-fill p-default pt-0">
              <ng-template [ngTemplateOutlet]="sheet" />
            </sd-form>
          } @else {
            <div class="flex-fill p-default pt-0">
              <ng-template [ngTemplateOutlet]="sheet" />
            </div>
          }
        </div>
      </ng-template>
    </sd-base-container>

    <ng-template #sheet>
      <sd-sheet
        [key]="key() + '-sheet'"
        [items]="items()"
        [(currentPage)]="currentPage"
        [totalPageCount]="totalPageCount()"
        [itemsPerPage]="itemsPerPage()"
        [visiblePageCount]="visiblePageCount()"
        [(sorts)]="sorts"
        [useAutoSort]="totalPageCount() === 0"
        [selectMode]="selectMode() ?? (canDelete() ? 'multi' : undefined)"
        [(selectedKeys)]="selectedKeys"
        [getItemSelectableFn]="getItemSelectableFn()"
        [trackByFn]="trackByFn()"
        [getItemCellStyleFn]="getItemCellStyleFn"
        [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
        [columnControlsInput]="columnControls()"
        (selectedKeysChange)="onSelectedKeysChange()"
      >
        @if (canDelete() && inlineEdit()) {
          <sd-sheet-column
            [fixed]="true"
            [key]="'deleteButton'"
            [disableResizing]="true"
            [disableSorting]="true"
          >
            <ng-template #headerTpl>
              <div class="p-xs-sm tx-center">
                <ng-icon [svg]="tablerEraser" />
              </div>
            </ng-template>
            <ng-template [cell]="items()" let-item="item">
              <div class="p-xs-sm">
                <sd-anchor
                  [theme]="'danger'"
                  (click)="isDeleted(item) ? restore.emit([item]) : delete.emit([item])"
                >
                  <ng-icon [svg]="isDeleted(item) ? tablerRestore : tablerEraser" />
                </sd-anchor>
              </div>
            </ng-template>
          </sd-sheet-column>
        }
      </sd-sheet>
    </ng-template>
  `,
})
export class SdCrudList<TItem, TKey> {
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });

  ready = model(false);
  initialized = input(false);
  busyCount = model(0);
  restricted = input(false);
  canCreate = input(true);
  canEdit = input(true);
  canDelete = input(true);
  inlineEdit = input(true);
  viewType = input.required<SdViewType>();
  selectMode = input<"single" | "multi">();
  key = input.required<string>();

  formCtrl = viewChild<SdForm>("formCtrl");

  filterSubmit = output();
  submit = output();
  create = output();
  delete = output<TItem[]>();
  restore = output<TItem[]>();

  items = input<TItem[]>([]);
  selectedKeys = model<NonNullable<TKey>[]>([]);

  currDeletedItems = input<TItem[]>([]);
  currDeletedSet = computed(() => new Set(this.currDeletedItems()));

  currSelectedItems = computed(() =>
    this.items().filter((it) => {
      const key = this.trackByFn()(it);
      return key != null && this.selectedKeys().includes(key);
    }),
  );

  currentPage = model(0);
  totalPageCount = input(0);
  itemsPerPage = input(0);
  visiblePageCount = input(10);
  sorts = model<SortingDef[]>([]);

  trackByFn = input.required<(item: TItem) => TKey>();
  getItemSelectableFn = input<(item: TItem) => boolean | string>();

  commandTplRef = contentChild<TemplateRef<void>>("commandTpl");
  filterTplRef = contentChild<TemplateRef<void>>("filterTpl");
  toolTplRef = contentChild<TemplateRef<void>>("toolTpl");
  bottomCommandTplRef = contentChild<TemplateRef<void>>("bottomCommandTpl");

  columnControls = contentChildren(SdSheetColumn);

  inlineEditEnabled = computed(() => this.canEdit() && this.inlineEdit());

  hasSelectedDeleted = computed(() => this.currSelectedItems().some((it) => this.isDeleted(it)));
  hasSelectedNotDeleted = computed(() =>
    this.currSelectedItems().some((it) => !this.isDeleted(it)),
  );

  getItemCellStyleFn = (item: TItem): string | undefined =>
    this.isDeleted(item) ? "text-decoration: line-through;" : undefined;

  isDeleted(item: TItem) {
    return this.currDeletedSet().has(item);
  }

  onSaveButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  onModalSelectionCancelClick(): void {
    this.selectedKeys.set([]);

    if (this.selectMode() === "single") {
      this._sdActivatedModal?.contentComponent().close.emit({ selectedKeys: [] });
    }
  }

  onModalSelectionConfirmClick() {
    const selectedKeys = this.selectedKeys();
    this._sdActivatedModal?.contentComponent().close.emit({ selectedKeys });
  }

  onSelectedKeysChange() {
    if (this.viewType() !== "modal") return;
    if (this.selectMode() !== "single") return;

    const selectedKeys = this.selectedKeys();
    if (selectedKeys.length !== 1) return;

    this._sdActivatedModal?.contentComponent().close.emit({ selectedKeys });
  }

  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerCirclePlus = tablerCirclePlus;
  protected readonly tablerEraser = tablerEraser;
  protected readonly tablerRestore = tablerRestore;
  protected readonly tablerSearch = tablerSearch;
}
