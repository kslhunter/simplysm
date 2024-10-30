import {
  ErrorHandler,
  inject,
  ModuleWithProviders,
  NgModule,
  provideExperimentalZonelessChangeDetection,
} from "@angular/core";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/SdSaveCommandEventPlugin";
import { SdRefreshCommandEventPlugin } from "./plugins/SdRefreshCommandEventPlugin";
import { SdInsertCommandEventPlugin } from "./plugins/SdInsertCommandEventPlugin";
import { SdResizeEventPlugin } from "./plugins/SdResizeEventPlugin";
import { SdGlobalErrorHandlerPlugin } from "./plugins/SdGlobalErrorHandlerPlugin";
import { SdOptionEventPlugin } from "./plugins/SdOptionEventPlugin";
import { FaConfig } from "@fortawesome/angular-fontawesome";
import { ISdAngularIcon, SdAngularConfigProvider } from "./providers/SdAngularConfigProvider";
import { SdBackbuttonEventPlugin } from "./plugins/SdBackbuttonEventPlugin";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faAngleDown,
  faAngleLeft,
  faAngleRight,
  faAngleUp,
  faArrowLeft,
  faArrowRight,
  faBars,
  faCaretDown,
  faCaretRight,
  faCheck,
  faCode,
  faCog,
  faEdit,
  faExternalLink,
  faEye,
  faEyeSlash,
  faMinus,
  faMountainSun,
  faPen,
  faPlus,
  faQuestion,
  faQuestionCircle,
  faSave,
  faSearch,
  faSort,
  faSortDown,
  faSortUp,
  faStar,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { SdThemeProvider } from "./providers/SdThemeProvider";
import { SdLocalStorageProvider } from "./providers/SdLocalStorageProvider";
import { ISdAppStructureItem } from "./utils/SdAppStructureUtil";

@NgModule({
  imports: [],
})
export class SdAngularModule {
  #sdNgConf = inject(SdAngularConfigProvider);
  #sdTheme = inject(SdThemeProvider);
  #sdLocalStorage = inject(SdLocalStorageProvider);
  #faConfig = inject(FaConfig);

  constructor() {
    this.#sdTheme.theme.set(this.#sdLocalStorage.get("sd-theme") ?? this.#sdNgConf.defaultTheme);
    this.#faConfig.fallbackIcon = this.#sdNgConf.icons.fallback;
  }

  static forRoot(opt: {
    clientName: string;
    appStructure?: ISdAppStructureItem[];
    defaultTheme?: "compact" | "modern" | "mobile" | "kiosk";
    icons?: ISdAngularIcon;
  }): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        {
          provide: SdAngularConfigProvider,
          useFactory: () => {
            const provider = new SdAngularConfigProvider();
            provider.clientName = opt.clientName;
            provider.appStructure = opt.appStructure ?? [];
            provider.defaultTheme = opt.defaultTheme ?? "modern";
            provider.icons = opt.icons ?? {
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

              /*plusCircle: faPlusCircle,
               eraser: faEraser,
              redo: faRedo,
              upload: faUpload,
              fileExcel: faFileExcel,*/

              search: faSearch,
              externalLink: faExternalLink,
              edit: faEdit,
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
      ],
    };
  }
}
