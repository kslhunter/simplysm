import { ISdAngularIcon, SdAngularConfigProvider } from "./providers/SdAngularConfigProvider";
import {
  DestroyRef,
  EnvironmentInjector,
  EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/commands/SdSaveCommandEventPlugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/SdRefreshCommandEventPlugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/SdInsertCommandEventPlugin";
import { SdResizeEventPlugin } from "./plugins/events/SdResizeEventPlugin";
import { SdOptionEventPlugin } from "./plugins/events/SdOptionEventPlugin";
import { SdBackbuttonEventPlugin } from "./plugins/events/SdBackbuttonEventPlugin";
import { SdThemeProvider, TSdTheme } from "./providers/SdThemeProvider";
import { SdLocalStorageProvider } from "./providers/SdLocalStorageProvider";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SdBusyProvider } from "./providers/SdBusyProvider";
import { SwUpdate } from "@angular/service-worker";
import { SdGlobalErrorHandlerPlugin } from "./plugins/SdGlobalErrorHandlerPlugin";
import { IMAGE_CONFIG } from "@angular/common";

export function provideSdAngular(opt: {
  clientName: string;
  defaultTheme: TSdTheme;
  defaultDark: boolean;
  icons: ISdAngularIcon;
}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    provideEnvironmentInitializer(() => {
      const _sdNgConf = inject(SdAngularConfigProvider);
      const _sdTheme = inject(SdThemeProvider);
      const _sdLocalStorage = inject(SdLocalStorageProvider);

      _sdTheme.theme.set(_sdLocalStorage.get("sd-theme") ?? _sdNgConf.defaultTheme);
      _sdTheme.dark.set(_sdLocalStorage.get("sd-theme-dark") ?? _sdNgConf.defaultDark);
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
        provider.defaultTheme = opt.defaultTheme;
        provider.defaultDark = opt.defaultDark;
        provider.icons = opt.icons;
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdBackbuttonEventPlugin, multi: true },
    { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideZonelessChangeDetection(),

    //-- 페이지 이동시 로딩 표시
    provideAppInitializer(() => {
      const router = inject(Router, { optional: true });
      if (!router) return;

      const sdBusy = inject(SdBusyProvider);

      router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          sdBusy.globalBusyCount.update((v) => v + 1);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          sdBusy.globalBusyCount.update((v) => v - 1);
        }
      });
    }),

    //-- SwUpdate
    provideAppInitializer(() => {
      const swUpdate = inject(SwUpdate, { optional: true });

      const updateFn = async () => {
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

        setTimeout(updateFn, 5 * 60 * 1000);
      };
      void updateFn();
    }),
  ]);
}
