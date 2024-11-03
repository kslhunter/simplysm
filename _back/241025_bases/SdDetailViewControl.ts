import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  model,
  output,
  TemplateRef,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { SdPaneControl } from "../controls/SdPaneControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdDockContainerControl } from "../controls/SdDockContainerControl";
import { SdFormControl } from "../controls/SdFormControl";
import { SdDockControl } from "../controls/SdDockControl";
import { SdButtonControl } from "../controls/SdButtonControl";
import { SdBusyContainerControl } from "../controls/SdBusyContainerControl";
import { $effect, $mark, $signal, TEffFn } from "../utils/$hooks";
import { SdToastProvider } from "../providers/SdToastProvider";
import { SdSharedDataProvider } from "../providers/SdSharedDataProvider";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdCheckboxControl } from "../controls/SdCheckboxControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";

@Component({
  selector: "sd-detail-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockContainerControl,
    SdPaneControl,
    SdFormControl,
    NgTemplateOutlet,
    SdDockControl,
    SdButtonControl,
    SdBusyContainerControl,
    SdCheckboxControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (initialized()) {
        <sd-dock-container>
          <sd-pane class="p-xl">
            <sd-form #formCtrl (submit)="onSubmit()">
              <ng-template [ngTemplateOutlet]="contentTemplateRef()!" />
            </sd-form>
            <br />
            <br />

            @if (footerTemplateRef()) {
              <ng-template [ngTemplateOutlet]="footerTemplateRef()!" />
            }
          </sd-pane>

          <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light flex-row">
            @if (!disabled() && data().id != null && data().isDeleted != null) {
              <div>
                <sd-checkbox
                  theme="danger"
                  [icon]="icons.xmark"
                  [(value)]="data().isDeleted!"
                  (valueChange)="$mark(data)"
                >
                  삭제
                </sd-checkbox>
              </div>
            }

            <div class="flex-grow tx-right">
              <sd-button theme="primary" [inline]="true" (click)="formCtrl.requestSubmit()">확인</sd-button>
            </div>
          </sd-dock>
        </sd-dock-container>
      }
    </sd-busy-container>
  `,
})
export class SdDetailViewControl<T extends { id?: number; isDeleted?: boolean }> {
  icons = inject(SdAngularConfigProvider).icons;
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  data = model.required<T>();

  disabled = input(false);

  searchEffFn = input.required<TEffFn<() => Promise<void>>>();
  submitFn = input<() => Promise<void>>();

  initEnd = output();

  contentTemplateRef = contentChild<any, TemplateRef<void>>("contentTemplate", { read: TemplateRef });
  footerTemplateRef = contentChild<any, TemplateRef<void>>("footerTemplate", { read: TemplateRef });

  initialized = $signal(false);
  busyCount = $signal(0);

  orgData = $signal<T>();

  constructor() {
    $effect(() => {
      for (const sig of this.searchEffFn().signals) {
        sig();
      }

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.searchEffFn()();
          this.orgData.set(ObjectUtil.clone(this.data()));
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
        this.initEnd.emit();
      });
    });
  }

  async onSubmit() {
    if (!this.submitFn()) return;
    if (this.disabled()) return;

    if (ObjectUtil.equal(this.orgData(), this.data())) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.submitFn()!();

      await this.searchEffFn()();
      this.#sdToast.success("저장되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  protected readonly $mark = $mark;
}
