import {
  ApplicationRef,
  createComponent,
  effect,
  EnvironmentInjector,
  inject,
  Injectable,
  Injector,
  signal,
  type ComponentRef,
  type OutputEmitterRef,
  type Type,
  type WritableSignal,
} from "@angular/core";
import { outputToObservable } from "@angular/core/rxjs-interop";
import type { DirectiveInputSignals } from "../directive-input-signals";
import { SdToast } from "./sd-toast";
import { SdToastContainer } from "./sd-toast-container";
import { SdSystemLogProvider } from "../config/sd-system-log.provider";
import "@simplysm/core-browser";

export type SdToastSeverity = "info" | "success" | "warning" | "danger";
export type SdToastTheme = "primary" | SdToastSeverity | "gray" | "blue-gray";

export interface SdToastContentDef<O> {
  close: OutputEmitterRef<O | undefined>;
}

export interface SdToastInput<T extends SdToastContentDef<any>> {
  type: Type<T>;
  inputs: Omit<DirectiveInputSignals<T>, "close">;
}

@Injectable({ providedIn: "root" })
export class SdToastProvider {
  private readonly _appRef = inject(ApplicationRef);
  private readonly _envInjector = inject(EnvironmentInjector);
  private readonly _injector = inject(Injector);
  private readonly _sdSystemLog = inject(SdSystemLogProvider);

  alertThemes = signal<SdToastSeverity[]>([]);
  overlap = signal(false);
  beforeShowFn?: (theme: SdToastSeverity) => void;

  private _containerRef: ComponentRef<SdToastContainer> | undefined;
  private readonly _toastRefs: ComponentRef<SdToast>[] = [];
  private readonly _contentRefs = new Map<ComponentRef<SdToast>, ComponentRef<any>>();
  private readonly _autoDismissCleanups = new Map<ComponentRef<SdToast>, () => void>();

  constructor() {
    effect(() => {
      if (this._containerRef != null) {
        this._containerRef.setInput("overlap", this.overlap());
      }
    });
  }

  private _getContainerRef(): ComponentRef<SdToastContainer> {
    if (this._containerRef == null) {
      this._containerRef = createComponent(SdToastContainer, {
        environmentInjector: this._envInjector,
      });
      this._appRef.attachView(this._containerRef.hostView);
      document.body.appendChild(this._containerRef.location.nativeElement);
      this._containerRef.setInput("overlap", this.overlap());
    }
    return this._containerRef;
  }

  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;
  info(message: string, useProgress = false): WritableSignal<number> | void {
    return this._show("info", message, useProgress);
  }

  success(message: string, useProgress?: true): WritableSignal<number>;
  success(message: string, useProgress?: false): void;
  success(message: string, useProgress = false): WritableSignal<number> | void {
    return this._show("success", message, useProgress);
  }

  warning(message: string, useProgress?: true): WritableSignal<number>;
  warning(message: string, useProgress?: false): void;
  warning(message: string, useProgress = false): WritableSignal<number> | void {
    return this._show("warning", message, useProgress);
  }

  danger(message: string, useProgress?: true): WritableSignal<number>;
  danger(message: string, useProgress?: false): void;
  danger(message: string, useProgress = false): WritableSignal<number> | void {
    return this._show("danger", message, useProgress);
  }

  notify<T extends SdToastContentDef<any>>(
    input: SdToastInput<T>,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined> {
    return new Promise((resolve) => {
      // overlap 모드: 기존 토스트 모두 제거
      if (this.overlap()) {
        this._removeAllToasts();
      }

      const containerEl = this._getContainerRef().location.nativeElement as HTMLElement;

      // 토스트 래퍼 생성
      const toastRef = createComponent(SdToast, {
        environmentInjector: this._envInjector,
      });
      this._appRef.attachView(toastRef.hostView);

      // 커스텀 컴포넌트 생성 (projectableNodes로 토스트 래퍼 안에 삽입)
      const contentRef: ComponentRef<T> = createComponent(input.type, {
        environmentInjector: this._envInjector,
        elementInjector: this._injector,
      });
      this._appRef.attachView(contentRef.hostView);

      // inputs 바인딩
      for (const [key, value] of Object.entries(input.inputs as Record<string, unknown>)) {
        contentRef.setInput(key, value);
      }

      // 컨텐츠를 토스트 래퍼 안에 삽입
      const toastEl = toastRef.location.nativeElement as HTMLElement;
      toastEl.appendChild(contentRef.location.nativeElement);
      containerEl.appendChild(toastEl);
      this._toastRefs.push(toastRef);

      // repaint 후 open 설정
      toastEl.repaint();
      toastRef.instance.open.set(true);

      // contentRef를 추적하여 토스트 파괴 시 함께 정리
      this._contentRefs.set(toastRef, contentRef);

      // close output 구독
      const closeSub = outputToObservable(contentRef.instance.close).subscribe((result) => {
        closeSub.unsubscribe();
        this._dismissToast(toastRef);
        resolve(result);
      });

      // 5초 후 자동 해제 (resolve 연동)
      this._setupAutoDismiss(toastRef, 5000, () => {
        closeSub.unsubscribe();
        resolve(undefined);
      });
    });
  }

  async try<R>(fn: () => Promise<R>, messageFn?: (err: Error) => string): Promise<R | undefined>;
  try<R>(fn: () => R, messageFn?: (err: Error) => string): R | undefined;
  async try<R>(
    fn: () => Promise<R> | R,
    messageFn?: (err: Error) => string,
  ): Promise<R | undefined> {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }

      const message = messageFn != null ? messageFn(err) : err.message;
      this.danger(message);
      await this._sdSystemLog.writeAsync("error", err.stack ?? err.message);
      return undefined;
    }
  }

  private _show(
    theme: SdToastSeverity,
    message: string,
    useProgress: boolean,
  ): WritableSignal<number> | void {
    // alertThemes 체크
    if (this.alertThemes().includes(theme)) {
      window.alert(message);
      return;
    }

    // beforeShowFn 콜백
    if (this.beforeShowFn != null) {
      this.beforeShowFn(theme);
    }

    // overlap 모드: 기존 토스트 모두 제거
    if (this.overlap()) {
      this._removeAllToasts();
    }

    // 토스트 컴포넌트 생성
    const containerEl = this._getContainerRef().location.nativeElement as HTMLElement;
    const toastRef = createComponent(SdToast, {
      environmentInjector: this._envInjector,
    });
    this._appRef.attachView(toastRef.hostView);

    toastRef.setInput("theme", theme);
    toastRef.setInput("useProgress", useProgress);
    toastRef.instance.message.set(message);

    containerEl.appendChild(toastRef.location.nativeElement);
    this._toastRefs.push(toastRef);

    // repaint 후 open 설정
    (toastRef.location.nativeElement as HTMLElement).repaint();
    toastRef.instance.open.set(true);

    if (useProgress) {
      // progress 모드: effect로 100% 감지 후 1초 뒤 자동 해제
      const progressSignal = toastRef.instance.progress;

      effect(
        (onCleanup) => {
          const val = progressSignal();
          if (val >= 100) {
            const timerId = setTimeout(() => {
              this._dismissToast(toastRef);
            }, 1000);
            onCleanup(() => clearTimeout(timerId));
          }
        },
        { injector: toastRef.injector },
      );

      return progressSignal;
    } else {
      // 일반 모드: 3초 후 자동 해제 (호버 중이면 1초 지연)
      this._setupAutoDismiss(toastRef, 3000);
    }
  }

  private _setupAutoDismiss(
    toastRef: ComponentRef<SdToast>,
    delayMs: number,
    onDismiss?: () => void,
  ): void {
    const el = toastRef.location.nativeElement as HTMLElement;
    const ac = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let isHovering = false;
    let dismissPending = false;
    let dismissed = false;

    // 타이머·리스너 정리. 외부 파괴 경로(_dismissToast/_destroyToast)에서도 호출되어
    // 죽은 toastRef 에 대해 타이머가 깨어나는 race 와 리스너 누수를 막는다.
    const cleanup = () => {
      dismissed = true;
      if (timerId != null) clearTimeout(timerId);
      ac.abort();
      this._autoDismissCleanups.delete(toastRef);
    };
    this._autoDismissCleanups.set(toastRef, cleanup);

    const dismiss = () => {
      if (dismissed) return;
      onDismiss?.();
      this._dismissToast(toastRef);
    };

    const dismissAfterDelay = (ms: number) => {
      timerId = setTimeout(() => {
        if (dismissed) return;
        if (isHovering) {
          dismissPending = true;
        } else {
          dismiss();
        }
      }, ms);
    };

    el.addEventListener(
      "mouseenter",
      () => {
        isHovering = true;
      },
      { signal: ac.signal },
    );
    el.addEventListener(
      "mouseleave",
      () => {
        isHovering = false;
        if (dismissPending) {
          dismissPending = false;
          dismissAfterDelay(1000);
        }
      },
      { signal: ac.signal },
    );

    dismissAfterDelay(delayMs);
  }

  private _dismissToast(toastRef: ComponentRef<SdToast>): void {
    this._autoDismissCleanups.get(toastRef)?.();
    toastRef.instance.open.set(false);

    const el = toastRef.location.nativeElement as HTMLElement;
    let fallbackId: ReturnType<typeof setTimeout>;

    const onTransitionEnd = () => {
      clearTimeout(fallbackId);
      el.removeEventListener("transitionend", onTransitionEnd);
      this._destroyToast(toastRef);
    };

    el.addEventListener("transitionend", onTransitionEnd);

    // fallback: transition이 없는 경우 300ms 후 파괴
    fallbackId = setTimeout(() => {
      el.removeEventListener("transitionend", onTransitionEnd);
      this._destroyToast(toastRef);
    }, 300);
  }

  private _destroyToast(toastRef: ComponentRef<SdToast>): void {
    this._autoDismissCleanups.get(toastRef)?.();

    const idx = this._toastRefs.indexOf(toastRef);
    if (idx === -1) return; // 이미 파괴됨

    this._toastRefs.splice(idx, 1);

    // 연결된 contentRef 파괴
    const contentRef = this._contentRefs.get(toastRef);
    if (contentRef != null) {
      this._contentRefs.delete(toastRef);
      this._appRef.detachView(contentRef.hostView);
      contentRef.destroy();
    }

    const el = toastRef.location.nativeElement as HTMLElement;
    if (el.parentNode != null) {
      el.parentNode.removeChild(el);
    }
    this._appRef.detachView(toastRef.hostView);
    toastRef.destroy();
  }

  private _removeAllToasts(): void {
    for (const ref of [...this._toastRefs]) {
      this._destroyToast(ref);
    }
  }
}
