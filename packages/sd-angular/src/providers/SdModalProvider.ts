import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector, Type} from "@angular/core";
import {SdModalEntryControl} from "../controls/SdModalEntryControl";

@Injectable()
export class SdModalProvider {
  private readonly _appRef: ApplicationRef;

  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector) {
    let rootInjector = this._injector;
    while (!rootInjector["_def"].isRoot) {
      rootInjector = rootInjector["_parent"];
    }
    this._appRef = rootInjector.get<ApplicationRef>(ApplicationRef);
  }

  public async showAsync<T extends SdModalBase<any, any>>(modalType: Type<T>,
                                                          title: string,
                                                          param: T["_tInput"],
                                                          options?: {
                                                            hideCloseButton?: boolean;
                                                            useCloseByBackdrop?: boolean;
                                                            useCloseByEscapeKey?: boolean;
                                                            float?: boolean;
                                                          }): Promise<T["_tOutput"] | undefined> {
    return await new Promise<T["_tOutput"] | undefined>(async (resolve, reject) => {
        try {
          const userModalRef = this._cfr.resolveComponentFactory(modalType).create(this._injector);
          const modalEntryRef = this._cfr.resolveComponentFactory(SdModalEntryControl).create(
            this._injector,
            [[userModalRef.location.nativeElement]]
          );

          const modalEntryEl = modalEntryRef.location.nativeElement as HTMLElement;

          const rootComp = this._appRef.components[0];
          const rootCompEl = rootComp.location.nativeElement as HTMLElement;
          rootCompEl.appendChild(modalEntryEl);


          const prevActiveElement = document.activeElement as HTMLElement | undefined;
          userModalRef.instance.close = (value?: T["_tOutput"]) => {
            resolve(value);

            modalEntryEl.addEventListener("transitionend", () => {
              userModalRef.destroy();
              modalEntryRef.destroy();
            });
            modalEntryRef.instance.open = false;

            if (prevActiveElement) {
              prevActiveElement.focus();
            }
          };

          modalEntryRef.instance.title = title;
          modalEntryRef.instance.hideCloseButton = options?.hideCloseButton;
          modalEntryRef.instance.useCloseByBackdrop = options?.useCloseByBackdrop;
          modalEntryRef.instance.useCloseByEscapeKey = options?.useCloseByEscapeKey;
          modalEntryRef.instance.float = options?.float;
          modalEntryRef.instance.openChange.subscribe(() => {
            if (!modalEntryRef.instance.open) {
              userModalRef.instance.close();
            }
          });

          this._appRef.attachView(userModalRef.hostView);
          this._appRef.attachView(modalEntryRef.hostView);

          modalEntryRef.instance.open = true;
          modalEntryEl.findFocusableAll()[0]!.focus();
          await userModalRef.instance.sdOnOpen(param);
        }
        catch (err) {
          reject(err);
        }
      }
    );
  }
}

export abstract class SdModalBase<I, O> {
  public _tInput!: I;
  public _tOutput!: O;

  public abstract sdOnOpen(param: I): void | Promise<void>;

  public close(value?: O): void {
    throw new Error("모달이 초기화되어있지 않습니다.");
  }
}