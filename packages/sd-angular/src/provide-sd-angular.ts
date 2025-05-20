import { ISdAppStructureItem } from "./utils/sd-app-structure.utils";
import { ISdAngularIcon, SdAngularConfigProvider } from "./providers/sd-angular-config.provider";
import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideExperimentalZonelessChangeDetection,
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
  faEyeSlash, faFileExcel,
  faMinus,
  faMountainSun,
  faPen,
  faPlus, faPlusCircle,
  faQuestion,
  faQuestionCircle, faRedo, faRefresh,
  faSave,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faStar,
  faTriangleExclamation, faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/commands/sd-save-command.event-plugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/sd-refresh-command.event-plugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/sd-insert-command.event-plugin";
import { SdResizeEventPlugin } from "./plugins/events/sd-resize.event-plugin";
import { SdOptionEventPlugin } from "./plugins/events/sd-option.event-plugin";
import { SdBackbuttonEventPlugin } from "./plugins/events/sd-backbutton.event-plugin";
import { SdGlobalErrorHandlerPlugin } from "./plugins/sd-global-error-handler.plugin";
import { SdThemeProvider, TSdTheme } from "./providers/sd-theme.provider";
import { SdLocalStorageProvider } from "./providers/sd-local-storage.provider";

export function provideSdAngular(opt: {
  clientName: string;
  appStructure?: ISdAppStructureItem[];
  defaultTheme?: TSdTheme;
  defaultDark?: boolean;
  icons?: Partial<ISdAngularIcon>;
}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ENVIRONMENT_INITIALIZER,
      useFactory: () => {
        const _sdNgConf = inject(SdAngularConfigProvider);
        const _sdTheme = inject(SdThemeProvider);
        const _sdLocalStorage = inject(SdLocalStorageProvider);

        return () => {
          _sdTheme.theme.set(_sdLocalStorage.get("sd-theme") ?? _sdNgConf.defaultTheme);
          _sdTheme.dark.set(_sdLocalStorage.get("sd-theme-dark") ?? _sdNgConf.defaultDark);
        };
      },
      multi: true,
    },
    {
      provide: SdAngularConfigProvider,
      useFactory: () => {
        const provider = new SdAngularConfigProvider();
        provider.clientName = opt.clientName;
        provider.appStructure = opt.appStructure ?? [];
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
    { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideExperimentalZonelessChangeDetection(),
  ]);
}