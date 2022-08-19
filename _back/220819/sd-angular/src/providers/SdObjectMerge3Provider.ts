import { Injectable } from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdToastRootProvider } from "../root-providers/SdToastRootProvider";
import { SdObjectMerge3Modal } from "../modals/SdObjectMerge3Modal";
import { SdModalRootProvider } from "../root-providers/SdModalRootProvider";

@Injectable({ providedIn: null })
export class SdObjectMerge3Provider {
  public constructor(private readonly _modal: SdModalRootProvider,
                     private readonly _toast: SdToastRootProvider) {
  }

  public async merge<T extends Record<string, any>, O extends Record<string, any>, Y extends Record<string, any>>(
    param: ISdObjectMerge3Param<T, O, Y>,
    beforeModalCallback?: () => void | Promise<void>,
    afterModalCallback?: () => void | Promise<void>
  ): Promise<(T & O & Y) | undefined> {
    const keys: (keyof T & keyof O & keyof Y)[] = (
      param.displayNameRecord
        ? Object.keys(param.displayNameRecord)
        : Object.keys(param.theirs).concat(Object.keys(param.origin)).concat(Object.keys(param.yours))
    )
      .distinct()
      .filter((key) => !(param.origin[key] === undefined && param.theirs[key] === undefined && param.yours[key] === undefined));

    const theirs = ObjectUtil.pick(param.theirs, keys);
    const origin = ObjectUtil.pick(param.origin, keys);
    const yours = ObjectUtil.pick(param.yours, keys);

    const merge3Result = ObjectUtil.merge3(theirs, origin, yours, param.equalOptionsObj);
    if (merge3Result.conflict) {
      await beforeModalCallback?.();
      const conflictItemMergeResult = await this._toast.tryAsync(async () => {
        return await this._modal.showAsync(SdObjectMerge3Modal, param.modalTitle ?? "업데이트 충돌 해결", {
          theirs,
          origin: merge3Result.result,
          yours,
          displayNameRecord: param.displayNameRecord,
          valueTextConverter: param.valueTextConverter as any
        }, {
          disableCloseByBackdrop: true,
          disableCloseByEscapeKey: true
        });
      });
      await afterModalCallback?.();

      if (conflictItemMergeResult === undefined) {
        return undefined;
      }
      return conflictItemMergeResult as any;
    }
    else {
      return merge3Result.result as any;
    }
  }
}


export interface ISdObjectMerge3Param<T extends Record<string, any>, O extends Record<string, any>, Y extends Record<string, any>> {
  theirs: T;
  origin: O;
  yours: Y;
  modalTitle?: string;
  displayNameRecord?: Partial<Record<keyof T & keyof O & keyof Y, string>>;
  valueTextConverter?: <K extends keyof T & keyof O & keyof Y>(key: K, value: T[K] | O[K] | Y[K], item: T | O | Y) => string | undefined;
  equalOptionsObj?: Record<string, { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean }>;
}
