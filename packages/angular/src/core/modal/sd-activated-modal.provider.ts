import { Injectable, signal } from "@angular/core";
import type { SdModalContentDef } from "./sd-modal.provider";

/**
 * 모달 내부에서 inject하여 사용하는 프로바이더
 */
@Injectable()
export class SdActivatedModalProvider<T extends SdModalContentDef<any> = SdModalContentDef<any>> {
  modalComponent = signal<any>(undefined);
  contentComponent = signal<T | undefined>(undefined);
  canDeactiveFn: () => boolean = () => true;
}
