import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  effect,
  HostListener,
  inject,
  input,
  output,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $obj } from "../../utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../utils/setups/setup-can-deactivate";
import { TSdViewType, useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../pipes/format.pipe";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $signal } from "../../utils/bindings/$signal";
import { injectParent } from "../../utils/injections/inject-parent";
import { ISdModal } from "../../providers/sd-modal.provider";
import { SdTopbarMenuControl } from "../../controls/sd-topbar-menu.control";
import { SdTopbarMenuItemControl } from "../../controls/sd-topbar-menu-item.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { SdPaneControl } from "../../controls/sd-pane.control";

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainerControl,
    SdFormControl,
    SdButtonControl,
    NgTemplateOutlet,
    FormatPipe,
    FaIconComponent,
    SdTopbarMenuControl,
    SdTopbarMenuItemControl,
    SdDockContainerControl,
    SdDockControl,
    SdPaneControl,
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.currViewType()"
      [initialized]="parent.initialized()"
      [restricted]="parent.restricted?.()"
    >
      @if (!parent.readonly?.()) {
        <ng-template #pageTopbar>
          <sd-topbar-menu>
            <sd-topbar-menu-item (click)="onSubmitButtonClick()">
              <fa-icon [icon]="icons.save" [fixedWidth]="true" />
              저장
              <small>(CTRL+S)</small>
            </sd-topbar-menu-item>
          </sd-topbar-menu>
        </ng-template>
      }

      @if (!parent.readonly?.() || toolTemplateRef() != null) {
        <ng-template #controlTool>
          @if (!parent.readonly?.()) {
            <div class="p-sm-lg flex-row flex-gap-sm">
              <sd-button theme="primary" (click)="onSubmitButtonClick()">
                <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                저장
                <small>(CTRL+S)</small>
              </sd-button>
              @if ((!parent.isNew || !parent.isNew()) && parent.toggleDelete) {
                @if (parent.dataInfo && parent.dataInfo().isDeleted) {
                  <sd-button theme="warning" (click)="parent.doToggleDelete(false)">
                    <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                    복구
                  </sd-button>
                } @else {
                  <sd-button theme="danger" (click)="parent.doToggleDelete(true)">
                    <fa-icon [icon]="icons.eraser" [fixedWidth]="true" />
                    삭제
                  </sd-button>
                }
              }
            </div>
          }
          @if (toolTemplateRef() != null) {
            <div class="p-sm-lg">
              <ng-template [ngTemplateOutlet]="toolTemplateRef() ?? null" />
            </div>
          }
        </ng-template>
      }

      <ng-template #content>
        <sd-dock-container style="min-width: 20em">
          @if (prevTemplateRef() != null) {
            <sd-dock class="p-lg">
              <ng-template [ngTemplateOutlet]="prevTemplateRef() ?? null" />
            </sd-dock>
          }
          <sd-pane class="p-lg">
            <sd-form #formCtrl (submit)="onSubmit()">
              <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
            </sd-form>
          </sd-pane>
          @if (parent.dataInfo && (parent.dataInfo().lastModifiedAt || parent.dataInfo().lastModifiedBy)) {
            <sd-dock position="bottom" class="bg-theme-grey-lightest p-sm-default">
              최종수정:
              {{ parent.dataInfo().lastModifiedAt! | format: "yyyy-MM-dd HH:mm" }}
              ({{ parent.dataInfo().lastModifiedBy }})
            </sd-dock>
          }
          @if (nextTemplateRef() != null) {
            <sd-dock position="bottom" class="p-lg">
              <ng-template [ngTemplateOutlet]="nextTemplateRef() ?? null" />
            </sd-dock>
          }
        </sd-dock-container>
      </ng-template>

      @if (!parent.readonly?.()) {
        <ng-template #modalBottom>
          <div class="p-sm-default flex-row bdt bdt-theme-grey-lightest">
            @if ((!parent.isNew || !parent.isNew()) && parent.toggleDelete) {
              <div>
                @if (parent.dataInfo && parent.dataInfo().isDeleted) {
                  <sd-button theme="warning" inline (click)="parent.doToggleDelete(false)">복구</sd-button>
                } @else {
                  <sd-button theme="danger" inline (click)="parent.doToggleDelete(true)">삭제</sd-button>
                }
              </div>
            }

            <div class="flex-grow tx-right">
              <sd-button theme="primary" inline (click)="onSubmitButtonClick()">확인</sd-button>
            </div>
          </div>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataDetailControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  parent = injectParent<AbsSdDataDetail<any>>();

  formCtrl = viewChild<SdFormControl>("formCtrl");

  contentTemplateRef = contentChild.required("content", { read: TemplateRef });
  toolTemplateRef = contentChild("tool", { read: TemplateRef });
  prevTemplateRef = contentChild("prev", { read: TemplateRef });
  nextTemplateRef = contentChild("next", { read: TemplateRef });

  @HostListener("sdRefreshCommand")
  async onRefreshButtonClick() {
    await this.parent.doRefresh();
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    if (this.parent.busyCount() > 0) return;

    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit();
  }
}

@Directive()
export abstract class AbsSdDataDetail<T extends object | undefined, R = boolean> implements ISdModal<R> {
  //-- abstract

  restricted?: Signal<boolean>; // computed (use권한)
  readonly?: Signal<boolean>; // computed (edit권한)
  isNew?: Signal<boolean>; // computed
  dataInfo?: Signal<ISdDataDetailDataInfo>; // computed

  prepareRefreshEffect?(): void;

  abstract load(): Promise<T> | T;

  toggleDelete?(del: boolean): Promise<R> | R;

  submit?(): Promise<R> | R;

  //-- implement
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  #viewType = useViewTypeSignal(() => this);
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  busyCount = $signal(0);
  initialized = $signal(false);
  close = output<R>();

  data = $signal<T>(undefined as T);

  constructor() {
    effect(() => {
      this.prepareRefreshEffect?.();
      /*const reflected = reflectComponentType(this.constructor as any)!;
      const inputPropNames = reflected.inputs.map((item) => item.propName);
      for (const inputPropName of inputPropNames) {
        if (inputPropName === "viewType") continue;
        this[inputPropName]();
      }*/

      queueMicrotask(async () => {
        if (this.restricted?.()) {
          this.initialized.set(true);
          return;
        }

        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    setupCanDeactivate(() => this.currViewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return !$obj(this.data).changed() || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  async doRefresh() {
    if (this.busyCount() > 0) return;
    if (!this.checkIgnoreChanges()) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async refresh() {
    this.data.set(await this.load());
    if (!this.isNew || !this.isNew()) {
      $obj(this.data).snapshot();
    }
  }

  async doToggleDelete(del: boolean) {
    if (this.busyCount() > 0) return;
    if (this.readonly?.()) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(
      async () => {
        const result = await this.toggleDelete?.(del);
        if (!result) return;

        this.#sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);

        this.close.emit(result);
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);
  }

  async doSubmit() {
    if (this.busyCount() > 0) return;
    if (this.readonly?.()) return;
    if (!this.submit) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(
      async () => {
        const result = await this.submit!();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions
        if (!result) return;

        this.#sdToast.success("저장되었습니다.");

        this.close.emit(result);

        await this.refresh();
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);
  }

  #getOrmDataEditToastErrorMessage(err: Error) {
    if (
      err.message.includes("a parent row: a foreign key constraint") ||
      err.message.includes("conflicted with the REFERENCE")
    ) {
      return "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망";
    } else {
      return err.message;
    }
  }
}

export interface ISdDataDetailDataInfo {
  isDeleted?: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
