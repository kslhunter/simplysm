import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
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
import { $effect } from "../../utils/bindings/$effect";
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
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.currViewType()"
      [initialized]="parent.initialized()"
      [restricted]="parent.restricted?.()"
    >
      @if (!parent.readonly?.()) {
        <ng-template #tool>
          <div class="p-sm-lg flex-row flex-gap-sm">
            <sd-button theme="primary" (click)="onSubmitButtonClick()">
              <fa-icon [icon]="icons.save" [fixedWidth]="true" />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
            @if (!parent.isNew() && parent.toggleDelete) {
              @if (!parent.dataInfo().isDeleted) {
                <sd-button theme="danger" (click)="parent.doToggleDelete(true)">삭제</sd-button>
              } @else {
                <sd-button theme="warning" (click)="parent.doToggleDelete(false)">복구</sd-button>
              }
            }
          </div>
          @if (toolTemplateRef() != null) {
            <div class="p-sm-lg">
              <ng-template [ngTemplateOutlet]="toolTemplateRef() ?? null" />
            </div>
          }
        </ng-template>
      }

      <ng-template #content>
        @if (prevTemplateRef() != null) {
          <div class="p-lg">
            <ng-template [ngTemplateOutlet]="prevTemplateRef() ?? null" />
          </div>
        }
        <div class="p-lg">
          <sd-form #formCtrl (submit)="onSubmit()">
            <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
          </sd-form>
        </div>
        @if (parent.dataInfo().lastModifiedAt || parent.dataInfo().lastModifiedBy) {
          <div class="bg-theme-grey-lightest p-sm-default">
            최종수정:
            {{ parent.dataInfo().lastModifiedAt! | format: "yyyy-MM-dd HH:mm" }}
            ({{ parent.dataInfo().lastModifiedBy }})
          </div>
        }
        @if (nextTemplateRef() != null) {
          <div class="p-lg">
            <ng-template [ngTemplateOutlet]="nextTemplateRef() ?? null" />
          </div>
        }
      </ng-template>

      @if (!parent.readonly?.()) {
        <ng-template #modalBottom>
          <div class="p-sm-default flex-row bdt bdt-theme-grey-lightest">
            @if (!parent.isNew() && parent.toggleDelete) {
              <div>
                @if (!parent.dataInfo().isDeleted) {
                  <sd-button theme="danger" inline (click)="parent.doToggleDelete(true)">
                    삭제
                  </sd-button>
                } @else {
                  <sd-button theme="warning" inline (click)="parent.doToggleDelete(false)">
                    복구
                  </sd-button>
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
export abstract class AbsSdDataDetail<T extends object | undefined, R = boolean>
  implements ISdModal<R>
{
  //-- abstract

  restricted?: Signal<boolean>; // computed (use권한)
  readonly?: Signal<boolean>; // computed (edit권한)
  abstract isNew: Signal<boolean>; // computed
  abstract dataInfo: Signal<ISdDataDetailDataInfo>; // computed
  loadConditions?: Signal<any>[];

  abstract load(): Promise<T> | T;

  toggleDelete?(del: boolean): Promise<R> | R;

  abstract submit(): Promise<R> | R;

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
    $effect(
      [
        () => {
          for (const loadCondition of this.loadConditions ?? []) {
            loadCondition();
          }
        },
      ],
      async () => {
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
      },
    );

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
    $obj(this.data).snapshot();
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
      () => {
        return "삭제할 수 없습니다. 연동된 작업이 있는지 확인하세요.";
      },
    );
    this.busyCount.update((v) => v - 1);
  }

  async doSubmit() {
    if (this.busyCount() > 0) return;
    if (this.readonly?.()) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const result = await this.submit();
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions
      if (!result) return;

      this.#sdToast.success("저장되었습니다.");

      this.close.emit(result);

      await this.refresh();
    });
    this.busyCount.update((v) => v - 1);
  }
}

export interface ISdDataDetailDataInfo {
  isDeleted: boolean | undefined;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
