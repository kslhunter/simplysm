import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdAngularConfigProvider } from "../../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { ISdViewModel, TSdViewModelGenericTypes } from "../ISdViewModel";
import { $effect, $obj } from "../../../utils/$hooks";
import { SdSharedDataProvider } from "../../shared-data/sd-shared-data.provider";

@Component({
  selector: "sd-detail-view-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdFormControl,
  ],
  template: `
    <sd-form (submit)="onSubmit()">
      <ng-content />
    </sd-form>

    @if (data().lastModifyDateTime) {
      최종수정:
      {{ data().lastModifyDateTime!.toFormatString("yyyy-MM-dd HH:mm") }}
      ({{ data().lastModifierName }})
    }
  `,
})
export class SdDetailViewBaseControl<VM extends ISdViewModel> {
  protected icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  protected formCtrl = viewChild(SdFormControl);

  vm = input.required<VM>();

  initialized = model(false);
  busyCount = model(0);

  dataId = input<number>();
  defaultData = input.required<TSdViewModelGenericTypes<VM>["DD"]>();
  data = model.required<TSdViewModelGenericTypes<VM>["DD"]>();

  constructor() {
    $effect([this.dataId, this.defaultData], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      await this.refreshAsync();
      this.initialized.set(true);
    });
  }

  async refreshAsync() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#sdSharedData.wait();
      await this.#refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async #refresh() {
    if (this.dataId() == null) {
      this.data.set(this.defaultData());
    }
    else {
      this.data.set(await this.vm().getDetailAsync(this.dataId()!));
    }
    $obj(this.data).snapshot();
  }

  async deleteAsync() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().changeDeleteStatesAsync([this.data().id!], true);

      this.#sdToast.success("삭제되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async restoreAsync() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().changeDeleteStatesAsync([this.data().id!], false);

      this.#sdToast.success("복구되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  requestSubmit() {
    this.formCtrl()?.requestSubmit();
  }

  protected async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().upsertAsync(this.data());

      this.#sdToast.success("저장되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}
