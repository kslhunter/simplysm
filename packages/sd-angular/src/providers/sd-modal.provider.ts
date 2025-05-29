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
  Type,
} from "@angular/core";
import { SdModalControl } from "../controls/sd-modal.control";
import { $signal } from "../utils/bindings/$signal";
import { TDirectiveInputSignals } from "../utils/types";

export class SdModalInstance<T extends ISdModal<any>> {
  private readonly _activatedModalProvider: SdActivatedModalProvider<T>;
  private readonly _compRef: ComponentRef<T>;
  private readonly _modalRef: ComponentRef<SdModalControl>;
  private readonly _prevActiveEl?: HTMLElement;

  private _open = $signal(false);

  close = new EventEmitter<any>();

  constructor(
    appRef: ApplicationRef,
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
  ) {
    //-- Provider
    this._activatedModalProvider = new SdActivatedModalProvider<T>();

    //-- Content component
    this._compRef = createComponent(modal.type, {
      environmentInjector: appRef.injector,
      elementInjector: Injector.create({
        parent: appRef.injector,
        providers: [{ provide: SdActivatedModalProvider, useValue: this._activatedModalProvider }],
      }),
      bindings: [
        ...Object.keys(modal.inputs).map((inputKey) =>
          inputBinding(inputKey, () => modal.inputs[inputKey]),
        ),
        outputBinding("close", (val) => this._onComponentClosed(val)),
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

        inputBinding("open", this._open),
        outputBinding("openChange", (val: boolean) => this._onModalOpenChange(val)),
      ],
    });
    this._activatedModalProvider.modalComponent.set(this._modalRef.instance);
    const modalEl = this._modalRef.location.nativeElement as HTMLElement;

    this._prevActiveEl = document.activeElement as HTMLElement | undefined;

    document.body.appendChild(modalEl);

    appRef.attachView(this._compRef.hostView);
    appRef.attachView(this._modalRef.hostView);

    requestAnimationFrame(() => {
      this._open.set(true);

      requestAnimationFrame(() => {
        if (options?.noFirstControlFocusing) {
          this._modalRef.instance.dialogElRef().nativeElement.focus();
        } else {
          (
            compEl.findFocusableFirst() ?? this._modalRef.instance.dialogElRef().nativeElement
          ).focus();
        }
      });
    });
  }

  private _onModalOpenChange(val: boolean) {
    if (!this._activatedModalProvider.canDeactivefn()) return;

    if (val) {
      this._open.set(val);
    } else {
      this._onComponentClosed(undefined);
    }
  }

  private _onComponentClosed(val: any) {
    if (val != null && !this._activatedModalProvider.canDeactivefn()) return;

    const modalEl = this._modalRef.location.nativeElement as HTMLElement;
    modalEl.addEventListener("transitionend", () => {
      this._compRef.destroy();
      this._modalRef.destroy();
    });

    this._open.set(false);

    if (this._prevActiveEl) {
      this._prevActiveEl.focus();
    }

    this.close.emit(val);
  }
}

@Injectable({ providedIn: "root" })
export class SdModalProvider {
  private _appRef = inject(ApplicationRef);

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
    return await new Promise<Parameters<T["close"]["emit"]>[0] | undefined>((resolve, reject) => {
      this.modalCount.update((v) => v + 1);
      try {
        const modalInstance = new SdModalInstance(this._appRef, modal, options);
        modalInstance.close.subscribe((val) => {
          resolve(val);
        });
      } catch (err) {
        reject(err);
      }
      this.modalCount.update((v) => v - 1);
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
