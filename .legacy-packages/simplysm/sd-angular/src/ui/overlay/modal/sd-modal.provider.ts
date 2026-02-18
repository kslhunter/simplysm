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
  type Signal,
  TemplateRef,
  Type,
} from "@angular/core";
import { SdModalControl } from "./sd-modal.control";
import { $signal } from "../../../core/utils/bindings/$signal";
import type { TDirectiveInputSignals } from "../../../core/utils/TDirectiveInputSignals";
import { Wait } from "@simplysm/sd-core-common";
import { SdBusyProvider } from "../busy/sd-busy.provider";

export class SdModalInstance<T extends ISdModal<any>> {
  private readonly _activatedModalProvider: SdActivatedModalProvider<T>;
  private readonly _compRef: ComponentRef<T>;
  private readonly _modalRef: ComponentRef<SdModalControl>;

  private readonly _prevActiveEl?: HTMLElement;

  close = new EventEmitter<any>();

  private _closed = false;

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
    this._activatedModalProvider = new SdActivatedModalProvider<T>();

    //-- Content component
    const inputs = modal.inputs as Record<string, any>;
    this._compRef = createComponent(modal.type, {
      environmentInjector: appRef.injector,
      elementInjector: Injector.create({
        parent: appRef.injector,
        providers: [{ provide: SdActivatedModalProvider, useValue: this._activatedModalProvider }],
      }),
      bindings: [
        ...Object.keys(inputs).map((inputKey) => inputBinding(inputKey, () => inputs[inputKey])),
        outputBinding("close", (val) => this._onComponentClose(val)),
      ],
    });

    this._activatedModalProvider.contentComponent.set(this._compRef.instance);
    const compEl = this._compRef.location.nativeElement as HTMLElement;

    //-- Modal component
    this._modalRef = createComponent(SdModalControl, {
      environmentInjector: appRef.injector,
      projectableNodes: [[compEl]],
      elementInjector: Injector.create({
        parent: appRef.injector,
        providers: [{ provide: SdActivatedModalProvider, useValue: this._activatedModalProvider }],
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
        inputBinding("actionTplRef", () => this._compRef.instance.actionTplRef),

        outputBinding("openChange", (val: boolean) => this._onModalOpenChange(val)),
      ],
    });
    this._activatedModalProvider.modalComponent.set(this._modalRef.instance);
    const modalEl = this._modalRef.location.nativeElement as HTMLElement;

    this._prevActiveEl = document.activeElement as HTMLElement | undefined;

    document.body.appendChild(modalEl);

    appRef.attachView(this._compRef.hostView);
    appRef.attachView(this._modalRef.hostView);

    requestAnimationFrame(async () => {
      if (!this._compRef.instance.initialized()) {
        await Wait.until(() => this._compRef.instance.initialized(), undefined, 60 * 1000);
      }

      setTimeout(() => {
        sdBusy.globalBusyCount.update((v) => v - 1);
        this._modalRef.instance.open.set(true);

        requestAnimationFrame(() => {
          if (options?.noFirstControlFocusing) {
            this._modalRef.instance.dialogElRef().nativeElement.focus();
          } else {
            (
              compEl.findFocusableFirst() ?? this._modalRef.instance.dialogElRef().nativeElement
            ).focus();
          }
        });
      }, 100);
    });
  }

  /** 모달에서 open값이 변했을때 */
  private _onModalOpenChange(open: boolean) {
    if (open) return;
    if (this._closed) return;
    this._closed = true;

    this._close(undefined);
  }

  /** 사용자 컴포넌트에서 close 이벤트를 발생시켰을때 */
  private _onComponentClose(val: any) {
    if (!this._activatedModalProvider.canDeactivefn()) return;
    if (this._closed) return;
    this._closed = true;

    this._modalRef.instance.open.set(false);
    this._close(val);
  }

  private _close(val: any) {
    const modalEl = this._modalRef.location.nativeElement as HTMLElement;
    modalEl.addEventListener("transitionend", () => {
      this._compRef.destroy();
      this._modalRef.destroy();
    });

    if (this._prevActiveEl) {
      this._prevActiveEl.focus();
    }

    this.close.emit(val);
  }
}

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  private readonly _appRef = inject(ApplicationRef);

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
        const modalInstance = new SdModalInstance(this._appRef, modal, options);
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

  actionTplRef?: TemplateRef<any>;
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
