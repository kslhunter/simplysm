import type { EnvironmentProviders } from "@angular/core";
import {
  DestroyRef,
  effect,
  EnvironmentInjector,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { IMAGE_CONFIG } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SwUpdate } from "@angular/service-worker";
import { provideNgIconsConfig } from "@ng-icons/core";
import { SdBusyProvider } from "./providers/sd-busy.provider";
import { SdAngularConfigProvider } from "./providers/sd-angular-config.provider";
import { SdThemeProvider } from "./providers/sd-theme-provider";
import { SdLocalStorageProvider } from "./providers/sd-local-storage.provider";
import { SdGlobalErrorHandlerPlugin } from "./plugins/sd-global-error-handler.plugin";
import { SdSaveCommandEventPlugin } from "./plugins/commands/sd-save-command-event.plugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/sd-refresh-command-event.plugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/sd-insert-command-event.plugin";
import { SdResizeEventPlugin } from "./plugins/events/sd-resize-event.plugin";
import { SdIntersectionEventPlugin } from "./plugins/events/sd-intersection-event.plugin";
import { SdOptionEventPlugin } from "./plugins/events/sd-option-event.plugin";

export function provideSdAngular(opt: { clientName: string }): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    provideNgIconsConfig({
      strokeWidth: 1.5,
      size: "1.33em",
    }),
    provideEnvironmentInitializer(() => {
      const sdTheme = inject(SdThemeProvider);
      const sdLocalStorage = inject(SdLocalStorageProvider);

      const savedDark = sdLocalStorage.get("sd-theme-dark");
      if (savedDark != null) {
        sdTheme.dark.set(savedDark);
      }

      let prevDark = sdTheme.dark();
      effect(() => {
        const dark = sdTheme.dark();
        if (dark !== prevDark) {
          sdLocalStorage.set("sd-theme-dark", dark);
          prevDark = dark;
        }
      });
    }),
    provideEnvironmentInitializer(() => {
      const envInjector = inject(EnvironmentInjector);

      const rejectionListener = (event: PromiseRejectionEvent) => {
        event.preventDefault();
        const errorHandler = envInjector.get(ErrorHandler);
        errorHandler.handleError(event);
      };

      const errorListener = (event: ErrorEvent) => {
        event.preventDefault();
        const errorHandler = envInjector.get(ErrorHandler);
        errorHandler.handleError(event);
      };

      window.addEventListener("unhandledrejection", rejectionListener);
      window.addEventListener("error", errorListener);
      inject(DestroyRef).onDestroy(() => {
        window.removeEventListener("error", errorListener);
        window.removeEventListener("unhandledrejection", rejectionListener);
      });
    }),
    {
      provide: SdAngularConfigProvider,
      useFactory: () => {
        const provider = new SdAngularConfigProvider();
        provider.clientName = opt.clientName;
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdIntersectionEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideZonelessChangeDetection(),
    provideAppInitializer(() => {
      const swUpdate = inject(SwUpdate, { optional: true });
      const destroyRef = inject(DestroyRef);
      let timerId: ReturnType<typeof setTimeout> | undefined;
      let failCount = 0;
      const BASE_INTERVAL = 5 * 60 * 1000;
      const MAX_INTERVAL = 60 * 60 * 1000;

      const updateFn = async () => {
        try {
          if (swUpdate?.isEnabled) {
            if (await swUpdate.checkForUpdate()) {
              if (
                window.confirm(
                  "클라이언트가 업데이트되었습니다. 새로고침하시겠습니까?\n\n" +
                    "  - 새로고침하지 않으면 몇몇 기능이 정상적으로 동작하지 않을 수 있습니다.",
                )
              ) {
                await swUpdate.activateUpdate();
                window.location.reload();
              }
            }
          }
          failCount = 0;
        } catch {
          failCount++;
        } finally {
          const interval = Math.min(
            BASE_INTERVAL * Math.pow(2, Math.max(0, failCount - 1)),
            MAX_INTERVAL,
          );
          timerId = setTimeout(updateFn, interval);
        }
      };
      void updateFn();

      destroyRef.onDestroy(() => {
        if (timerId != null) {
          clearTimeout(timerId);
        }
      });
    }),
    provideAppInitializer(() => {
      const router = inject(Router, { optional: true });
      if (router == null) return;
      const sdBusy = inject(SdBusyProvider);
      const navEvent = toSignal(router.events);
      effect(() => {
        const event = navEvent();
        if (event instanceof NavigationStart) {
          sdBusy.globalBusyCount.update((v) => v + 1);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          sdBusy.globalBusyCount.update((v) => Math.max(0, v - 1));
        }
      });
    }),
  ]);
}
