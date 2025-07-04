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
import { SdRegionControl } from "../../controls/containers/sd-region";
import { SdFlexControl } from "../../controls/flex/sd-flex.control";
import { SdFlexItemControl } from "../../controls/flex/sd-flex-item.control";

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
    SdRegionControl,
    SdFlexControl,
    SdFlexItemControl,
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.currViewType()"
      [initialized]="parent.initialized()"
      [restricted]="parent.restricted?.()"
    >
      <!--@if (!parent.readonly?.()) {
        <ng-template #pageTopbar>
          <sd-topbar-menu>
            <sd-topbar-menu-item (click)="onSubmitButtonClick()">
              <fa-icon [icon]="icons.save" [fixedWidth]="true" />
              저장
              <small>(CTRL+S)</small>
            </sd-topbar-menu-item>
          </sd-topbar-menu>
        </ng-template>
      }-->

      <ng-template #content>
        <sd-flex vertical [class.p-xs]="parent.currViewType() === 'modal'">
          <sd-flex-item [fill]="parent.currViewType() !== 'modal'">
            <sd-region>
              <sd-flex vertical gap="default" padding="default">
                @if ((parent.currViewType() !== "modal" && !parent.readonly?.()) || toolTemplateRef() != null) {
                  <sd-flex-item>
                    <sd-flex gap="sm">
                      @if (parent.currViewType() !== "modal" && !parent.readonly?.()) {
                        <sd-flex-item>
                          <sd-button theme="primary" (click)="onSubmitButtonClick()">
                            <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                            저장
                          </sd-button>
                        </sd-flex-item>
                        @if ((!parent.isNew || !parent.isNew()) && parent.toggleDelete) {
                          @if (parent.dataInfo && parent.dataInfo().isDeleted) {
                            <sd-flex-item>
                              <sd-button theme="warning" (click)="onRestoreButtonClick()">
                                <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                                복구
                              </sd-button>
                            </sd-flex-item>
                          } @else {
                            <sd-flex-item>
                              <sd-button theme="danger" (click)="onDeleteButtonClick()">
                                <fa-icon [icon]="icons.eraser" [fixedWidth]="true" />
                                삭제
                              </sd-button>
                            </sd-flex-item>
                          }
                        }
                      }

                      @if (toolTemplateRef() != null) {
                        <sd-flex-item>
                          <ng-template [ngTemplateOutlet]="toolTemplateRef() ?? null" />
                        </sd-flex-item>
                      }
                    </sd-flex>
                  </sd-flex-item>
                }

                @if (prevTemplateRef() != null) {
                  <sd-flex-item>
                    <ng-template [ngTemplateOutlet]="prevTemplateRef() ?? null" />
                  </sd-flex-item>
                }
                <sd-flex-item fill>
                  <sd-form #formCtrl (submit)="onSubmit()">
                    <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
                  </sd-form>
                </sd-flex-item>

                @if (parent.dataInfo && (parent.dataInfo().lastModifiedAt || parent.dataInfo().lastModifiedBy)) {
                  <sd-flex-item>
                    최종수정:
                    {{ parent.dataInfo().lastModifiedAt! | format: "yyyy-MM-dd HH:mm" }}
                    ({{ parent.dataInfo().lastModifiedBy }})
                  </sd-flex-item>
                }
              </sd-flex>
            </sd-region>
          </sd-flex-item>

          @if (nextTemplateRef() != null) {
            <sd-flex-item>
              <sd-region contentClass="p-default">
                <ng-template [ngTemplateOutlet]="nextTemplateRef() ?? null" />
              </sd-region>
            </sd-flex-item>
          }
        </sd-flex>
      </ng-template>

      @if (!parent.readonly?.()) {
        <ng-template #modalBottom>
          <sd-flex class="p-sm-default bdt bdt-theme-grey-lightest bg-white">
            @if ((!parent.isNew || !parent.isNew()) && parent.toggleDelete) {
              <sd-flex-item>
                @if (parent.dataInfo && parent.dataInfo().isDeleted) {
                  <sd-button theme="warning" inline (click)="onRestoreButtonClick()">복구</sd-button>
                } @else {
                  <sd-button theme="danger" inline (click)="onDeleteButtonClick()">삭제</sd-button>
                }
              </sd-flex-item>
            }

            <sd-flex-item fill class="tx-right">
              <sd-button theme="primary" inline (click)="onSubmitButtonClick()">확인</sd-button>
            </sd-flex-item>
          </sd-flex>
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
    if (this.parent.busyCount() > 0) return;
    if (this.parent.restricted?.()) return;

    await this.parent.doRefresh();
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    if (this.parent.busyCount() > 0) return;
    if (this.parent.readonly?.()) return;

    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    if (this.parent.busyCount() > 0) return;
    if (this.parent.readonly?.()) return;

    await this.parent.doSubmit();
  }

  async onDeleteButtonClick() {
    if (this.parent.busyCount() > 0) return;
    if (this.parent.readonly?.()) return;

    await this.parent.doToggleDelete(true);
  }

  async onRestoreButtonClick() {
    if (this.parent.busyCount() > 0) return;
    if (this.parent.readonly?.()) return;

    await this.parent.doToggleDelete(false);
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

  submit?(): Promise<R | undefined> | R | undefined;

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

  async doSubmit(force?: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.submit) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(
      async () => {
        const result = await this.submit!();
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
