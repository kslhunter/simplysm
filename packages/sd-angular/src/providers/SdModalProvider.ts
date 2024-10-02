import { ApplicationRef, createComponent, Directive, inject, Injectable, Injector, input, Type } from "@angular/core";
import { SdModalControl } from "../controls/SdModalControl";
import { $signal } from "../utils/$hooks";
import { SdBusyProvider } from "./SdBusyProvider";

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  #appRef = inject(ApplicationRef);
  #sdBusy = inject(SdBusyProvider);

  modalCount = $signal(0);

  async showAsync<T extends SdModalBase<any, any>>(
    modalType: Type<T>,
    title: string,
    params: T["__tInput__"],
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
    },
  ): Promise<T["__tOutput__"] | undefined> {
    let isFirstOpen = true;

    this.#sdBusy.globalBusyCount.update((v) => v + 1);

    return await new Promise<T["__tOutput__"] | undefined>((resolve, reject) => {
      //-- Provider
      const provider = new SdActivatedModalProvider();

      //-- component
      const compRef = createComponent(modalType, {
        environmentInjector: this.#appRef.injector,
        elementInjector: Injector.create({
          parent: this.#appRef.injector,
          providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
        }),
      });
      provider.content = compRef.instance;

      const modalRef = createComponent(SdModalControl, {
        environmentInjector: this.#appRef.injector,
        projectableNodes: [[compRef.location.nativeElement]],
        elementInjector: Injector.create({
          parent: this.#appRef.injector,
          providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
        }),
      });
      provider.modal = modalRef.instance;

      const modalEl = modalRef.location.nativeElement as HTMLElement;

      const rootEl = this.#appRef.components[0].location.nativeElement as HTMLElement;
      rootEl.appendChild(modalEl);

      //-- attach comp

      compRef.setInput("title", title);
      compRef.setInput("params", params);

      const prevActiveElement = document.activeElement as HTMLElement | undefined;
      compRef.instance.close = (value?: T["__tOutput__"]): void => {
        resolve(value);

        modalEl.addEventListener("transitionend", () => {
          compRef.destroy();
          modalRef.destroy();
        });

        modalRef.setInput("open", false);
        this.modalCount.update((v) => v - 1);

        if (prevActiveElement) {
          prevActiveElement.focus();
        }
      };
      compRef.instance.open = () => {
        modalRef.instance.open.set(true);
        modalRef.instance.dialogElRef().nativeElement.focus();
        if (isFirstOpen) {
          isFirstOpen = false;
          this.#sdBusy.globalBusyCount.update((v) => v - 1);
        }
      };

      this.#appRef.attachView(compRef.hostView);

      //-- attach modal

      modalRef.setInput("key", options?.key);
      modalRef.setInput("title", title);
      modalRef.setInput("hideHeader", options?.hideHeader ?? false);
      modalRef.setInput("hideCloseButton", options?.hideCloseButton ?? false);
      modalRef.setInput("useCloseByBackdrop", options?.useCloseByBackdrop ?? false);
      modalRef.setInput("useCloseByEscapeKey", options?.useCloseByEscapeKey ?? false);
      modalRef.setInput("float", options?.float ?? false);
      modalRef.setInput("minHeightPx", options?.minHeightPx);
      modalRef.setInput("minWidthPx", options?.minWidthPx);
      modalRef.setInput("resizable", options?.resizable ?? false);
      modalRef.setInput("movable", options?.movable ?? false);
      modalRef.setInput("headerStyle", options?.headerStyle);
      modalRef.setInput("mobileFillDisabled", options?.mobileFillDisabled ?? false);
      modalRef.instance.open.subscribe((value: boolean) => {
        if (!value) {
          compRef.instance.close();
        }
      });

      this.#appRef.attachView(modalRef.hostView);

      this.modalCount.update((v) => v + 1);

      if (compRef.instance.__openPreserved__) {
        compRef.instance.open();
      }
    });
  }
}

@Directive()
export abstract class SdModalBase<I, O> {
  __tInput__!: I;
  __tOutput__!: O;
  __openPreserved__?: boolean;

  title = input.required<string>();
  params = input.required<I>();

  open() {
    this.__openPreserved__ = true;
  }

  close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}

@Injectable()
export class SdActivatedModalProvider {
  modal!: SdModalControl;
  content!: SdModalBase<any, any>;
}
