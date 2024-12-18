import { Directive, inject } from "@angular/core";
import { ISdViewModel, TSdViewModelGenericTypes } from "../ISdViewModel";
import { SD_MODAL_INPUT, SdModalBase } from "../../../controls/modal/sd-modal.provider";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { $effect, $obj, $signal } from "../../../utils/$hooks";
import { SdSharedDataProvider } from "../../shared-data/sd-shared-data.provider";

@Directive()
export abstract class SdDetailModalAbstract<
  VM extends ISdViewModel,
  P extends { itemId?: number }
> extends SdModalBase<P, boolean> {
  #sdSharedData = inject(SdSharedDataProvider);
  #sdToast = inject(SdToastProvider);

  abstract vm: ISdViewModel;

  initialized = $signal(false);
  busyCount = $signal(0);

  data = $signal<TSdViewModelGenericTypes<VM>["DD"]>(this.getDefaultDetailData());

  abstract getDefaultDetailData(params?: this[typeof SD_MODAL_INPUT]): TSdViewModelGenericTypes<VM>["DD"];

  constructor() {
    super();

    $effect([this.params], async () => {
      if (!this.vm.perms().includes("use")) {
        this.initialized.set(true);
        this.open();
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.#refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
      this.open();
    });
  }

  async #refresh() {
    if (this.params().itemId == null) {
      this.data.set(this.getDefaultDetailData(this.params()));
    }
    else {
      this.data.set(await this.vm.getDetailAsync(this.params().itemId!));
    }
    $obj(this.data).snapshot();
  }

  async onDeleteButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.vm.perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm.changeDeleteStatesAsync([this.data().id!], true);

      this.#sdToast.success("삭제되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.vm.perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm.changeDeleteStatesAsync([this.data().id!], false);

      this.#sdToast.success("복구되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.vm.perms().includes("edit")) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm.upsertAsync(this.data(), $obj(this.data).origin);

      this.#sdToast.success("저장되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }
}
