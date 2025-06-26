import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  EventEmitter,
  inject,
  Injectable,
  Injector,
  inputBinding,
  outputBinding,
  OutputEmitterRef,
  Signal,
  Type,
} from "@angular/core";
import { SdModalControl } from "../controls/sd-modal.control";
import { $signal } from "../utils/bindings/$signal";
import { TDirectiveInputSignals } from "../utils/types";
import { Wait } from "@simplysm/sd-core-common";
import { SdBusyProvider } from "./sd-busy.provider";

export class SdModalInstance<T extends ISdModal<any>> {
  readonly #activatedModalProvider: SdActivatedModalProvider<T>;
  readonly #compRef: ComponentRef<T>;
  readonly #modalRef: ComponentRef<SdModalControl>;

  readonly #prevActiveEl?: HTMLElement;

  #open = $signal(false);

  close = new EventEmitter<any>();

  constructor(
    appRef: ApplicationRef,
    modal: ISdModalInfo<T>,
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
  ) {
    //-- busy
    const sdBusy = appRef.injector.get(SdBusyProvider);
    sdBusy.globalBusyCount.update((v) => v + 1);

    //-- new Provider
    this.#activatedModalProvider = new SdActivatedModalProvider<T>();

    //-- Content component
    this.#compRef = createComponent(modal.type, {
      environmentInjector: appRef.injector,
      elementInjector: Injector.create({
        parent: appRef.injector,
        providers: [{ provide: SdActivatedModalProvider, useValue: this.#activatedModalProvider }],
      }),
      bindings: [
        ...Object.keys(modal.inputs).map((inputKey) => inputBinding(inputKey, () => modal.inputs[inputKey])),
        outputBinding("close", (val) => this.#onComponentClosed(val)),
      ],
    });

    this.#activatedModalProvider.contentComponent.set(this.#compRef.instance);
    const compEl = this.#compRef.location.nativeElement as HTMLElement;

    //-- Modal component
    this.#modalRef = createComponent(SdModalControl, {
      environmentInjector: appRef.injector,
      projectableNodes: [[compEl]],
      elementInjector: Injector.create({
        parent: appRef.injector,
        providers: [{ provide: SdActivatedModalProvider, useValue: this.#activatedModalProvider }],
      }),
      bindings: [
        inputBinding("title", () => modal.title),
        inputBinding("key", () => options?.key),
        inputBinding("hideHeader", () => options?.hideHeader ?? false),
        inputBinding("hideCloseButton", () => options?.hideCloseButton ?? false),
        inputBinding("useCloseByBackdrop", () => options?.useCloseByBackdrop ?? false),
        inputBinding("useCloseByEscapeKey", () => options?.useCloseByEscapeKey ?? false),
        inputBinding("float", () => options?.float ?? false),
        inputBinding("minHeightPx", () => options?.minHeightPx),
        inputBinding("minWidthPx", () => options?.minWidthPx),
        inputBinding("resizable", () => options?.resizable ?? true),
        inputBinding("movable", () => options?.movable ?? true),
        inputBinding("headerStyle", () => options?.headerStyle),
        inputBinding("fill", () => options?.fill ?? false),

        inputBinding("open", this.#open),
        outputBinding("openChange", (val: boolean) => this.#onModalOpenChange(val)),
      ],
    });
    this.#activatedModalProvider.modalComponent.set(this.#modalRef.instance);
    const modalEl = this.#modalRef.location.nativeElement as HTMLElement;

    this.#prevActiveEl = document.activeElement as HTMLElement | undefined;

    document.body.appendChild(modalEl);

    appRef.attachView(this.#compRef.hostView);
    appRef.attachView(this.#modalRef.hostView);

    requestAnimationFrame(async () => {
      if (!this.#compRef.instance.initialized()) {
        await Wait.until(() => this.#compRef.instance.initialized(), undefined, 60 * 1000);
      }

      setTimeout(() => {
        sdBusy.globalBusyCount.update((v) => v - 1);
        this.#open.set(true);

        requestAnimationFrame(() => {
          if (options?.noFirstControlFocusing) {
            this.#modalRef.instance.dialogElRef().nativeElement.focus();
          } else {
            (compEl.findFocusableFirst() ?? this.#modalRef.instance.dialogElRef().nativeElement).focus();
          }
        });
      }, 100);
    });
  }

  #onModalOpenChange(val: boolean) {
    if (!this.#activatedModalProvider.canDeactivefn()) return;

    if (val) {
      this.#open.set(val);
    } else {
      this.#onComponentClosed(undefined);
    }
  }

  #onComponentClosed(val: any) {
    if (val != null && !this.#activatedModalProvider.canDeactivefn()) return;

    const modalEl = this.#modalRef.location.nativeElement as HTMLElement;
    modalEl.addEventListener("transitionend", () => {
      this.#compRef.destroy();
      this.#modalRef.destroy();
    });

    this.#open.set(false);

    if (this.#prevActiveEl) {
      this.#prevActiveEl.focus();
    }

    this.close.emit(val);
  }
}

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  #appRef = inject(ApplicationRef);

  modalCount = $signal(0);

  async showAsync<T extends ISdModal<any>>(
    modal: ISdModalInfo<T>,
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
    return await new Promise<Parameters<T["close"]["emit"]>[0] | undefined>((resolve, reject) => {
      this.modalCount.update((v) => v + 1);
      try {
        const modalInstance = new SdModalInstance(this.#appRef, modal, options);
        modalInstance.close.subscribe((val) => {
          this.modalCount.update((v) => v - 1);
          resolve(val);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export interface ISdModal<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
}

@Injectable()
export class SdActivatedModalProvider<T> {
  modalComponent = $signal<SdModalControl>();
  contentComponent = $signal<T>();
  canDeactivefn = () => true;
}

export interface ISdModalInfo<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}
