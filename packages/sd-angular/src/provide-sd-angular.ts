import { ISdAngularIcon, SdAngularConfigProvider } from "./providers/sd-angular-config.provider";
import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faAngleDown,
  faAngleLeft,
  faAngleRight,
  faAngleUp,
  faArrowLeft,
  faArrowLeftLong,
  faArrowRight,
  faBars,
  faCaretDown,
  faCaretRight,
  faCheck,
  faCode,
  faCog,
  faEdit,
  faEraser,
  faExternalLink,
  faEye,
  faEyeSlash,
  faFileExcel,
  faMinus,
  faMountainSun,
  faPen,
  faPlus,
  faPlusCircle,
  faQuestion,
  faQuestionCircle,
  faRedo,
  faRefresh,
  faSave,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faStar,
  faTriangleExclamation,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/commands/sd-save-command.event-plugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/sd-refresh-command.event-plugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/sd-insert-command.event-plugin";
import { SdResizeEventPlugin } from "./plugins/events/sd-resize.event-plugin";
import { SdOptionEventPlugin } from "./plugins/events/sd-option.event-plugin";
import { SdBackbuttonEventPlugin } from "./plugins/events/sd-backbutton.event-plugin";
import { SdThemeProvider, TSdTheme } from "./providers/sd-theme.provider";
import { SdLocalStorageProvider } from "./providers/sd-local-storage.provider";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SdBusyProvider } from "./providers/sd-busy.provider";
import { SwUpdate } from "@angular/service-worker";

export function provideSdAngular(opt: {
  clientName: string;
  defaultTheme?: TSdTheme;
  defaultDark?: boolean;
  icons?: Partial<ISdAngularIcon>;
}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const _sdNgConf = inject(SdAngularConfigProvider);
      const _sdTheme = inject(SdThemeProvider);
      const _sdLocalStorage = inject(SdLocalStorageProvider);

      _sdTheme.theme.set(_sdLocalStorage.get("sd-theme") ?? _sdNgConf.defaultTheme);
      _sdTheme.dark.set(_sdLocalStorage.get("sd-theme-dark") ?? _sdNgConf.defaultDark);
    }),
    {
      provide: SdAngularConfigProvider,
      useFactory: () => {
        const provider = new SdAngularConfigProvider();
        provider.clientName = opt.clientName;
        provider.defaultTheme = opt.defaultTheme ?? "compact";
        provider.defaultDark = opt.defaultDark ?? false;
        provider.icons = {
          fallback: faQuestionCircle,

          caretDown: faCaretDown,
          code: faCode,
          eye: faEye,
          eyeSlash: faEyeSlash,
          pen: faPen,
          angleDown: faAngleDown,
          question: faQuestion,
          triangleExclamation: faTriangleExclamation,
          angleDoubleLeft: faAngleDoubleLeft,
          angleDoubleRight: faAngleDoubleRight,
          angleLeft: faAngleLeft,
          angleRight: faAngleRight,
          cog: faCog,
          arrowLeft: faArrowLeft,
          arrowRight: faArrowRight,
          caretRight: faCaretRight,
          save: faSave,
          star: faStar,
          mountainSun: faMountainSun,
          bars: faBars,
          angleUp: faAngleUp,
          questionCircle: faQuestionCircle,

          check: faCheck,
          minus: faMinus,
          plus: faPlus,
          xmark: faXmark,
          sort: faSort,
          sortDown: faSortDown,
          sortUp: faSortUp,

          eraser: faEraser,
          arrowLeftLong: faArrowLeftLong,

          search: faSearch,
          externalLink: faExternalLink,
          edit: faEdit,

          refresh: faRefresh,
          add: faPlusCircle,
          delete: faEraser,
          redo: faRedo,
          upload: faUpload,
          fileExcel: faFileExcel,

          ...opt.icons,
        };
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdBackbuttonEventPlugin, multi: true },
    // { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideBrowserGlobalErrorListeners(),
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
