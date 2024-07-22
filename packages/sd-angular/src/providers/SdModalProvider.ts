import {ApplicationRef, createComponent, inject, Injectable, Input, Type} from "@angular/core";
import {SdModalControl} from "../controls/SdModalControl";

@Injectable({providedIn: "root"})
export class SdModalProvider {
  #appRef = inject(ApplicationRef);

  modalCount = 0;

  async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                   title: string,
                                                   param: T["__tInput__"],
                                                   options?: {
                                                     key?: string;
                                                     hideHeader?: boolean;
                                                     hideCloseButton?: boolean;
                                                     useCloseByBackdrop?: boolean;
                                                     useCloseByEscapeKey?: boolean;
                                                     float?: boolean;
                                                     minHeightPx?: number;
                                                     minWidthPx?: number;
                                                     resizable?: boolean;
                                                     movable?: boolean;
                                                     headerStyle?: string;
                                                     mobileFillDisabled?: boolean;
                                                   }): Promise<T["__tOutput__"] | undefined> {
    return await new Promise<T["__tOutput__"] | undefined>((resolve, reject) => {
      //-- component
      const compRef = createComponent(modalType, {
        environmentInjector: this.#appRef.injector
      });

      const modalRef = createComponent(SdModalControl, {
        environmentInjector: this.#appRef.injector,
        projectableNodes: [[compRef.location.nativeElement]]
      });

      const modalEl = modalRef.location.nativeElement as HTMLElement;

      const rootEl = this.#appRef.components[0].location.nativeElement as HTMLElement;
      rootEl.appendChild(modalEl);

      //-- attach comp

      compRef.instance.isModal = true;
      compRef.instance.title = title;
      compRef.instance.param = param;

      const prevActiveElement = document.activeElement as HTMLElement | undefined;
      compRef.instance.close = (value?: T["__tOutput__"]): void => {
        resolve(value);

        modalEl.addEventListener("transitionend", () => {
          compRef.destroy();
          modalRef.destroy();
        });

        modalRef.instance.open = false;
        this.modalCount--;

        if (prevActiveElement) {
          prevActiveElement.focus();
        }
      };

      this.#appRef.attachView(compRef.hostView);

      //-- attach modal

      modalRef.instance.key = options?.key;
      modalRef.instance.title = title;
      modalRef.instance.hideHeader = options?.hideHeader ?? false;
      modalRef.instance.hideCloseButton = options?.hideCloseButton ?? false;
      modalRef.instance.useCloseByBackdrop = options?.useCloseByBackdrop ?? false;
      modalRef.instance.useCloseByEscapeKey = options?.useCloseByEscapeKey ?? false;
      modalRef.instance.float = options?.float ?? false;
      modalRef.instance.minHeightPx = options?.minHeightPx;
      modalRef.instance.minWidthPx = options?.minWidthPx;
      modalRef.instance.resizable = options?.resizable ?? false;
      modalRef.instance.movable = options?.movable ?? false;
      modalRef.instance.headerStyle = options?.headerStyle;
      modalRef.instance.mobileFillDisabled = options?.mobileFillDisabled ?? false;
      modalRef.instance.openChange.subscribe((value: boolean) => {
        modalRef.instance.open = value;
        if (!value) {
          compRef.instance.close();
        }
      });
      this.#appRef.attachView(modalRef.hostView);

      //-- show

      this.modalCount++;
      modalRef.instance.open = true;
      modalRef.instance.dialogElRef.nativeElement.focus();
    });
  }
}

@Injectable()
export abstract class SdModalBase<I, O> {
  __tInput__!: I;
  __tOutput__!: O;

  isModal = false;

  @Input({required: true}) title!: string;
  @Input({required: true}) param!: I;

  close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}
