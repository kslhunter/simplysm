import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  Injector,
  signal,
  type ComponentRef,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type Type,
} from "@angular/core";
import { outputToObservable } from "@angular/core/rxjs-interop";
import { Subscription } from "rxjs";
import type {
  DirectiveInputSignals,
  WithOptional,
} from "../directive-input-signals";
import { SdModal } from "./sd-modal";
import { SdActivatedModalProvider } from "./sd-activated-modal.provider";
import "@simplysm/core-browser";

/**
 * 모달 컴포넌트가 구현해야 하는 인터페이스
 */
export interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}

type SdModalExcludeKeys = "initialized" | "close" | "actionTplRef" | "_optionalModalInputs";
type SdModalOptionalKeys<T> = T extends { _optionalModalInputs?: infer K extends string }
  ? K
  : never;

/**
 * 모달 생성 시 전달하는 정보
 */
export interface SdModalInfo<T extends SdModalContentDef<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: WithOptional<
    Omit<DirectiveInputSignals<T>, SdModalExcludeKeys | X>,
    SdModalOptionalKeys<T> & keyof Omit<DirectiveInputSignals<T>, SdModalExcludeKeys | X>
  >;
}

/**
 * 모달 옵션
 */
export interface SdModalOptions {
  key?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  headerStyle?: string;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  float?: boolean;
  fill?: boolean;
  resizable?: boolean;
  movable?: boolean;
  position?: "bottom-right" | "top-right";
  minHeightPx?: number;
  minWidthPx?: number;
  heightPx?: number;
  widthPx?: number;
  noFirstControlFocusing?: boolean;
}

/**
 * 모달을 프로그래밍 방식으로 생성하는 프로바이더
 */
@Injectable({ providedIn: "root" })
export class SdModalProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _envInjector = inject(EnvironmentInjector);
  private readonly _injector = inject(Injector);

  modalCount = signal(0);

  async showAsync<T extends SdModalContentDef<any>>(
    modal: SdModalInfo<T>,
    options?: SdModalOptions,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined> {
    return new Promise<Parameters<T["close"]["emit"]>[0] | undefined>((resolve, reject) => {
      // 1. modalCount 증가
      this.modalCount.update((v) => v + 1);

      // 2. SdActivatedModalProvider 인스턴스 생성
      const activatedModal = new SdActivatedModalProvider<T>();

      // 3. 컨텐츠 컴포넌트 생성 (elementInjector에 SdActivatedModalProvider 주입)
      const contentInjector = Injector.create({
        providers: [{ provide: SdActivatedModalProvider, useValue: activatedModal }],
        parent: this._injector,
      });

      let contentRef: ComponentRef<T>;
      try {
        contentRef = createComponent(modal.type, {
          environmentInjector: this._envInjector,
          elementInjector: contentInjector,
        });
      } catch (err) {
        this.modalCount.update((v) => v - 1);
        reject(err);
        return;
      }

      // 4. setInput으로 inputs 바인딩
      for (const [key, value] of Object.entries(modal.inputs)) {
        contentRef.setInput(key, value);
      }

      // 5. SdModal 생성 (projectableNodes로 컨텐츠 삽입)
      const modalRef: ComponentRef<SdModal> = createComponent(SdModal, {
        environmentInjector: this._envInjector,
        elementInjector: contentInjector,
        projectableNodes: [[contentRef.location.nativeElement]],
      });

      // 6. 옵션 바인딩
      modalRef.setInput("title", modal.title);
      if (options != null) {
        for (const [key, value] of Object.entries(options)) {
          if (value != null && key !== "noFirstControlFocusing") {
            modalRef.setInput(key, value);
          }
        }
      }

      // 7. SdActivatedModalProvider에 컴포넌트 참조 설정
      activatedModal.modalComponent.set(modalRef.instance);
      activatedModal.contentComponent.set(contentRef.instance);

      // 7-1. actionTplRef 브릿지: 컨텐츠 컴포넌트 → 모달 컴포넌트
      if ("actionTplRef" in contentRef.instance) {
        let _actionTplRef = contentRef.instance.actionTplRef;
        Object.defineProperty(contentRef.instance, "actionTplRef", {
          get: () => _actionTplRef,
          set: (value: TemplateRef<any> | undefined) => {
            _actionTplRef = value;
            modalRef.setInput("actionTplRef", value);
          },
          configurable: true,
        });
      }

      // 8. appRef에 뷰 등록 + body에 삽입
      this._appRef.attachView(contentRef.hostView);
      this._appRef.attachView(modalRef.hostView);
      document.body.appendChild(modalRef.location.nativeElement);

      // 9. open 설정 + z-index
      modalRef.instance.open.set(true);
      this._assignZIndex(modalRef.location.nativeElement);

      // 10. 포커스 저장 및 설정
      const prevActiveEl = document.activeElement as HTMLElement | null;

      // 지연된 포커스 설정 (DOM 삽입 후 렌더링 완료 대기)
      queueMicrotask(() => {
        const modalEl = modalRef.location.nativeElement as HTMLElement;
        const dialogEl = modalEl.querySelector<HTMLElement>("._dialog");
        if (dialogEl == null) return;

        if (options?.noFirstControlFocusing === true) {
          dialogEl.focus();
        } else {
          // 컨텐츠 영역에서 첫 탭 이동 가능 요소 검색
          const contentEl = modalEl.querySelector("._content");
          const firstTabbable = contentEl?.findFirstTabbableChild();
          if (firstTabbable != null) {
            firstTabbable.focus();
          } else {
            dialogEl.focus();
          }
        }
      });

      // cleanup 함수
      let closeSub: Subscription | undefined;
      let closeRequestSub: Subscription | undefined;

      const cleanup = (result: Parameters<T["close"]["emit"]>[0] | undefined) => {
        closeSub?.unsubscribe();
        closeRequestSub?.unsubscribe();

        // 닫힘 애니메이션 트리거: open(false) → CSS transition 시작
        modalRef.instance.open.set(false);

        const modalEl = modalRef.location.nativeElement as HTMLElement;

        let destroyed = false;
        const doDestroy = () => {
          // transitionend 와 setTimeout 폴백 중 먼저 도달한 쪽에서 1회만 실행
          if (destroyed) return;
          destroyed = true;

          // DOM에서 제거
          if (modalEl.parentNode != null) {
            modalEl.parentNode.removeChild(modalEl);
          }

          // 뷰 분리 + 파괴
          this._appRef.detachView(modalRef.hostView);
          this._appRef.detachView(contentRef.hostView);
          modalRef.destroy();
          contentRef.destroy();

          // modalCount 감소
          this.modalCount.update((v) => v - 1);

          // 포커스 복귀
          if (prevActiveEl != null && prevActiveEl.isConnected) {
            prevActiveEl.focus();
          }

          resolve(result);
        };

        // transition duration 확인 후 대기 또는 즉시 destroy
        const duration = parseFloat(getComputedStyle(modalEl).transitionDuration || "0");
        if (duration > 0) {
          // transitionend 가 정상 경로. 단 백그라운드 탭, transition 인터럽트 시 미발화하므로
          // duration(초→ms) + 여유 100ms 후 발화하는 setTimeout 폴백을 함께 걸어 destroy 누락을 방지.
          modalEl.addEventListener("transitionend", doDestroy, { once: true });
          setTimeout(doDestroy, duration * 1000 + 100);
        } else {
          doDestroy();
        }
      };

      // 10. close output 구독 (컨텐츠 컴포넌트가 직접 close.emit 호출)
      closeSub = outputToObservable(contentRef.instance.close).subscribe((result) => {
        cleanup(result);
      });

      // 12. SdModal의 closeRequest 구독 (배경 클릭, ESC, 닫기 버튼)
      closeRequestSub = outputToObservable(modalRef.instance.closeRequest).subscribe(() => {
        cleanup(undefined);
      });
    });
  }

  private _assignZIndex(el: HTMLElement): void {
    const allModals = document.body.findAll<HTMLElement>("sd-modal");
    let maxZ = 4000;
    for (const m of allModals) {
      const z = parseInt(m.style.zIndex || "0", 10);
      if (z > maxZ) {
        maxZ = z;
      }
    }
    el.style.zIndex = String(maxZ + 1);
  }
}
