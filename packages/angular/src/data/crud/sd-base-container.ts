import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  effect,
  inject,
  input,
  model,
  TemplateRef,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { injectViewTitleSignal } from "../../core/routing/injectViewTitleSignal";
import { SdBusyContainer } from "../../core/busy/sd-busy-container";
import { SdSharedDataProvider } from "../../core/shared-data/sd-shared-data.provider";
import { SdToastProvider } from "../../core/toast/sd-toast.provider";
import { SdTopbar } from "../../layout/topbar/sd-topbar";
import { SdTopbarContainer } from "../../layout/topbar/sd-topbar-container";
import type { SdViewType } from "../../core/routing/injectViewTypeSignal";
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle } from "@ng-icons/tabler-icons";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "sd-base-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBusyContainer, NgIcon, SdTopbarContainer, NgTemplateOutlet, SdTopbar],
  template: `
    <sd-busy-container [busy]="initialized() && busyCount() > 0">
      @if (initialized()) {
        @if (restricted()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5rem'" />
            <br />
            <br />
            '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (viewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ viewTitle() }}</h4>

              <ng-template [ngTemplateOutlet]="topbarTplRef()" />
            </sd-topbar>

            <ng-template [ngTemplateOutlet]="content" />
          </sd-topbar-container>
        } @else {
          <ng-template [ngTemplateOutlet]="content" />
        }
      }
    </sd-busy-container>

    <ng-template #content>
      <div class="flex-column fill">
        @if (commandTplRef()) {
          <div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
            <ng-template [ngTemplateOutlet]="commandTplRef()" />
          </div>
        }

        <div class="flex-fill">
          <ng-content />
        </div>

        @if (bottomCommandTplRef()) {
          <div class="p-sm-default flex-row main-align-end gap-sm bdt bdt-theme-gray-lightest">
            <ng-template [ngTemplateOutlet]="bottomCommandTplRef()" />
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class SdBaseContainer {
  private readonly _sdSharedData = inject(SdSharedDataProvider);
  private readonly _sdToast = inject(SdToastProvider);

  viewTitle = injectViewTitleSignal();

  ready = model(false);
  initialized = input(false);
  busyCount = model(0);

  restricted = input(false);

  viewType = input.required<SdViewType>();

  topbarTplRef = contentChild<TemplateRef<void>>("topbarTpl");
  commandTplRef = contentChild<TemplateRef<void>>("commandTpl");
  bottomCommandTplRef = contentChild<TemplateRef<void>>("bottomCommandTpl");

  constructor() {
    effect(() => {
      if (this.restricted()) {
        this.ready.set(true);
        return;
      }

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._sdSharedData.wait();
        });
        this.busyCount.update((v) => v - 1);
        this.ready.set(true);
      });
    });
  }

  protected readonly tablerAlertTriangle = tablerAlertTriangle;
}
