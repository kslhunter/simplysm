import {
  ApplicationRef,
  createComponent,
  Directive,
  inject,
  Injectable,
  Injector,
  input,
  Type,
} from "@angular/core";
import { SdModalControl } from "../controls/sd-modal.control";

import { SdBusyProvider } from "./sd-busy.provider";
import { $signal } from "../utils/bindings/$signal";

export const SD_MODAL_INPUT = Symbol();
export const SD_MODEL_OUTPUT = Symbol();

const OPEN_PRESERVED = Symbol();

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  private _appRef = inject(ApplicationRef);
  private _sdBusy = inject(SdBusyProvider);

  modalCount = $signal(0);

  async showAsync<T extends SdModalBase<any, any>>(
    modalType: Type<T>,
    title: string,
    params: T[typeof SD_MODAL_INPUT],
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
  ): Promise<T[typeof SD_MODEL_OUTPUT] | undefined> {
    let isFirstOpen = true;

    this._sdBusy.globalBusyCount.update((v) => v + 1);

    return await new Promise<T[typeof SD_MODEL_OUTPUT] | undefined>((resolve, reject) => {
      try {
        //-- Provider
        const provider = new SdActivatedModalProvider();

        //-- component
        const compRef = createComponent(modalType, {
          environmentInjector: this._appRef.injector,
          elementInjector: Injector.create({
            parent: this._appRef.injector,
            providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
          }),
        });
        compRef.setInput("title", title);
        compRef.setInput("params", params);

        provider.content = compRef.instance;
        const compEl = compRef.location.nativeElement as HTMLElement;

        //-- modal
        const modalRef = createComponent(SdModalControl, {
          environmentInjector: this._appRef.injector,
          projectableNodes: [[compEl]],
          elementInjector: Injector.create({
            parent: this._appRef.injector,
            providers: [{ provide: SdActivatedModalProvider, useValue: provider }],
          }),
        });
        modalRef.setInput("key", options?.key);
        modalRef.setInput("title", title);
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

        provider.modal = modalRef.instance;
        const modalEl = modalRef.location.nativeElement as HTMLElement;

        modalRef.instance.__openChange.subscribe((value: boolean) => {
          if (!provider.canDeactivefn()) return;

          if (!value) {
            modalRef.setInput("open", value);
            compRef.instance.close(undefined, true);
          }
          else {
            modalRef.setInput("open", value);
          }
        });

        const prevActiveElement = document.activeElement as HTMLElement | undefined;
        compRef.instance.close = (
          value?: T[typeof SD_MODEL_OUTPUT],
          noCheckCanDeactive?: boolean,
        ): void => {
          if (!noCheckCanDeactive && !provider.canDeactivefn()) return;

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
          modalRef.setInput("open", true);

          if (isFirstOpen) {
            isFirstOpen = false;
            this._sdBusy.globalBusyCount.update((v) => v - 1);
          }

          requestAnimationFrame(
            () => {
              if (options?.noFirstControlFocusing) {
                modalRef.instance.dialogElRef().nativeElement.focus();
              }
              else {
                (
                  (compRef.location.nativeElement as HTMLElement).findFocusableFirst()
                  ?? modalRef.instance.dialogElRef().nativeElement
                ).focus();
              }
            },
          );
        };

        const rootEl = this._appRef.components[0].location.nativeElement as HTMLElement;
        rootEl.appendChild(modalEl);

        this._appRef.attachView(compRef.hostView);
        this._appRef.attachView(modalRef.hostView);

        this.modalCount.update((v) => v + 1);

        if (compRef.instance[OPEN_PRESERVED]) {
          compRef.instance.open();
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

@Directive()
export abstract class SdModalBase<I, O> {
  [SD_MODAL_INPUT]!: I;
  [SD_MODEL_OUTPUT]!: O;
  [OPEN_PRESERVED]?: boolean;

  title = input.required<string>();
  params = input.required<I>();

  open() {
    this[OPEN_PRESERVED] = true;
  }

  close(value?: O, noCheckCanDeactive?: boolean): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}

@Injectable()
export class SdActivatedModalProvider {
  modal!: SdModalControl;
  content!: SdModalBase<any, any>;
  canDeactivefn = () => true;
}