import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  HostListener,
  inject,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdPaneControl } from "../controls/layout/sd-pane.control";
import { SdFormControl } from "../controls/form/sd-form.control";
import { SdButtonControl } from "../controls/button/sd-button.control";
import { SdActivatedModalProvider } from "../controls/modal/sd-modal.provider";
import { $computed, $effect, $obj, $signal } from "../utils/$hooks";
import { SdBaseContainerControl } from "./sd-base-container.control";
import { TemplateTargetDirective } from "../directives/template-target.directive";
import { type ISdViewModel, type TSdViewModelGenericTypes } from "./ISdViewModel";
import { SdToastProvider } from "../controls/toast/sd-toast.provider";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdTopbarMenuControl } from "../controls/topbar/sd-topbar-menu.control";
import { SdIconControl } from "../controls/icon/sd-icon.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdSharedDataProvider } from "./shared-data/sd-shared-data.provider";
import { ActivatedRoute } from "@angular/router";
import { injectParent } from "../utils/injectParent";
import { injectActivatedPageCode$, injectPageCode$ } from "../utils/injectPageCode$";
import { TXT_CHANGE_IGNORE_CONFIRM } from "./commons";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "sd-detail-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdPaneControl,
    SdFormControl,
    SdButtonControl,
    SdBaseContainerControl,
    TemplateTargetDirective,
    SdTopbarMenuControl,
    SdIconControl,
    NgTemplateOutlet,
  ],
  template: `
    <sd-base-container
      [busy]="busyCount() > 0"
      [initialized]="initialized()"
      [containerType]="realContainerType()"
    >
      <ng-template target="topbar">
        @if (vm().perms().includes("edit")) {
          @if (this.vm().upsertsAsync) {
            <sd-topbar-menu (click)="onSubmitButtonClick()">
              <sd-icon [icon]="icons.save" fixedWidth />
              저장 <small>(CTRL+S)</small>
            </sd-topbar-menu>
          }
        }
        <sd-topbar-menu theme="info" (click)="onRefreshButtonClick()">
          <sd-icon [icon]="icons.refresh" fixedWidth />
          새로고침 <small>(CTRL+ALT+L)</small>
        </sd-topbar-menu>
      </ng-template>

      <ng-template target="content">
        <sd-pane class="p-lg">
          <sd-form #formCtrl (submit)="onSubmit()">
            <ng-content />
          </sd-form>

          <ng-template [ngTemplateOutlet]="getTemplateRef('next')" />

          @if (data().lastModifyDateTime) {
            최종수정:
            {{ data().lastModifyDateTime!.toFormatString("yyyy-MM-dd HH:mm") }}
            ({{ data().lastModifierName }})
          }
        </sd-pane>
      </ng-template>

      @if (vm().perms().includes('edit')) {
        <ng-template target="bottom">
          <div class="p-sm-default bdt bdt-trans-light flex-row">
            @if (data().id != null) {
              @if (vm().toggleDeletesAsync) {
                <div>
                  @if (!data().isDeleted) {
                    <sd-button
                      theme="danger"
                      inline
                      (click)="onToggleDeleteButtonClick(true)"
                    >
                      삭제
                    </sd-button>
                  } @else {
                    <sd-button
                      theme="warning"
                      inline
                      (click)="onToggleDeleteButtonClick(false)"
                    >
                      복구
                    </sd-button>
                  }
                </div>
              }
            }

            <div class="flex-grow tx-right">
              <sd-button theme="primary" inline (click)="onSubmitButtonClick()">
                확인
              </sd-button>
            </div>
          </div>
        </ng-template>
      }
    </sd-base-container>`,
})
export class SdDetailBaseContainerControl<VM extends ISdViewModel> {
  icons = inject(SdAngularConfigProvider).icons;

  #activatedRoute = inject(ActivatedRoute, { optional: true });
  #sdToast = inject(SdToastProvider);
  #sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  #sdSharedData = inject(SdSharedDataProvider);

  #parent = injectParent();

  #pageCode = injectPageCode$();
  #activatedPageCode = injectActivatedPageCode$();

  formCtrlControl = viewChild<SdFormControl>("formCtrl");

  templateDirectives = contentChildren(TemplateTargetDirective);
  getTemplateRef = (target: "next") => {
    return this.templateDirectives().single(item => item.target() === target)?.templateRef ?? null;
  };

  vm = input.required<VM>();

  initialized = $signal(false);
  busyCount = model(0);

  data = model.required<TSdViewModelGenericTypes<VM>["DD"]>();
  defaultData = input.required<TSdViewModelGenericTypes<VM>["DD"]>();
  dataId = input<number>();

  realContainerType = $computed<"container" | "page" | "modal" | "control">(() => {
    if (this.containerType()) return this.containerType()!;
    else if (this.#activatedRoute && this.#activatedRoute.component === this.#parent.constructor) {
      if (this.#pageCode() === this.#activatedPageCode()) {
        return "page";
      }
      else {
        return "container";
      }
    }
    else if (this.#sdActivatedModal) {
      return "modal";
    }
    else {
      return "control";
    }
  });
  containerType = input<"container" | "page" | "modal" | "control">();

  constructor() {
    $effect([this.dataId, this.defaultData], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      await this.refresh();
      this.initialized.set(true);
    });
  }

  checkIgnoreChanges() {
    return !$obj(this.data).changed() || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  @HostListener("sdRefreshCommand")
  async onRefreshButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.checkIgnoreChanges()) return;

    await this.refresh();
  }

  async refresh() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#sdSharedData.wait();
      await this.#refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async #refresh() {
    if (this.dataId() == null) {
      this.data.set(ObjectUtil.clone(this.defaultData()));
    }
    else {
      this.data.set(await this.vm().getDetailAsync!(this.dataId()!));
    }
    $obj(this.data).snapshot();
  }

  async onToggleDeleteButtonClick(del: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;
    if (!this.vm().toggleDeletesAsync) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().toggleDeletesAsync!([this.data().id!], del);

      await this.#refresh();

      this.#sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
      this.#sdActivatedModal?.content.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    this.formCtrlControl()?.requestSubmit();
  }

  async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;
    if (!this.vm().upsertsAsync) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().upsertsAsync!([
        {
          data: this.data(),
          orgData: $obj(this.data).origin,
        },
      ]);

      await this.#refresh();

      this.#sdToast.success("저장되었습니다.");
      this.#sdActivatedModal?.content.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }
}