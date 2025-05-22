import {
  ApplicationRef,
  createComponent,
  inject,
  Injectable,
  Injector,
  OutputEmitterRef,
  Type,
} from "@angular/core";
import { SdModalControl } from "../controls/sd-modal.control";
import { $signal } from "../utils/bindings/$signal";
import { TDirectiveInputSignals } from "../utils/types";

import { SdBusyProvider } from "./sd-busy.provider";

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  private _appRef = inject(ApplicationRef);
  private _sdBusy = inject(SdBusyProvider);

  modalCount = $signal(0);

  async showAsync<T extends ISdModal<any>>(
    modal: ISdModalInput<T>,
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
      fill?: boolean;
      noFirstControlFocusing?: boolean;
    },
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined> {
    let isFirstOpen = true;

    this._sdBusy.globalBusyCount.update((v) => v + 1);

    return await new Promise<Parameters<T["close"]["emit"]>[0] | undefined>((resolve, reject) => {
      try {
        //-- Provider
        const provider = new SdActivatedModalProvider<T>();

        //-- Content component
        const compRef = createComponent(modal.type, {
          environmentInjector: this._appRef.injector,
          elementInjector: Injector.create({
            parent: this._appRef.injector,
            providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
          }),
        });
        for (const inputKey in modal.inputs) {
          compRef.setInput(inputKey, modal.inputs[inputKey]);
        }

        provider.contentComponent.set(compRef.instance);
        const compEl = compRef.location.nativeElement as HTMLElement;

        //-- Modal component
        const modalRef = createComponent(SdModalControl, {
          environmentInjector: this._appRef.injector,
          projectableNodes: [[compEl]],
          elementInjector: Injector.create({
            parent: this._appRef.injector,
            providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
          }),
        });
        modalRef.setInput("title", modal.title);
        modalRef.setInput("key", options?.key);
        modalRef.setInput("hideHeader", options?.hideHeader ?? false);
        modalRef.setInput("hideCloseButton", options?.hideCloseButton ?? false);
        modalRef.setInput("useCloseByBackdrop", options?.useCloseByBackdrop ?? false);
        modalRef.setInput("useCloseByEscapeKey", options?.useCloseByEscapeKey ?? false);
        modalRef.setInput("float", options?.float ?? false);
        modalRef.setInput("minHeightPx", options?.minHeightPx);
        modalRef.setInput("minWidthPx", options?.minWidthPx);
        modalRef.setInput("resizable", options?.resizable ?? true);
        modalRef.setInput("movable", options?.movable ?? true);
        modalRef.setInput("headerStyle", options?.headerStyle);
        modalRef.setInput("fill", options?.fill ?? false);

        provider.modalComponent.set(modalRef.instance);
        const modalEl = modalRef.location.nativeElement as HTMLElement;

        modalRef.instance.open.subscribe((value: boolean) => {
          if (!provider.canDeactivefn()) return;

          if (!value) {
            modalRef.setInput("open", value);
            compRef.instance.close.emit(undefined);
          } else {
            modalRef.setInput("open", value);
          }
        });

        const prevActiveElement = document.activeElement as HTMLElement | undefined;
        compRef.instance.close.subscribe((value: Parameters<T["close"]["emit"]>[0] | undefined) => {
          if (value != null && !provider.canDeactivefn()) return;

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
        });

        const rootEl = this._appRef.components[0].location.nativeElement as HTMLElement;
        rootEl.appendChild(modalEl);

        this._appRef.attachView(compRef.hostView);
        this._appRef.attachView(modalRef.hostView);

        //-- open

        this.modalCount.update((v) => v + 1);
        requestAnimationFrame(() => {
          modalRef.setInput("open", true);

          if (isFirstOpen) {
            isFirstOpen = false;
            this._sdBusy.globalBusyCount.update((v) => v - 1);
          }

          requestAnimationFrame(() => {
            if (options?.noFirstControlFocusing) {
              modalRef.instance.dialogElRef().nativeElement.focus();
            } else {
              (
                (compRef.location.nativeElement as HTMLElement).findFocusableFirst() ??
                modalRef.instance.dialogElRef().nativeElement
              ).focus();
            }
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export interface ISdModal<O> {
  close: OutputEmitterRef<O | undefined>;
}

@Injectable()
export class SdActivatedModalProvider<T> {
  modalComponent = $signal<SdModalControl>();
  contentComponent = $signal<T>();
  canDeactivefn = () => true;
}

export interface ISdModalInput<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
