/// <reference types="@simplysm/sd-angular/src/assets"/>

import {
  enableProdMode,
  inject,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { EventEmitter } from "events";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppPage } from "./AppPage";
import { provideSdAngular, SdServiceClientFactoryProvider } from "@simplysm/sd-angular";
import { faXmark } from "@fortawesome/pro-regular-svg-icons/faXmark";
import { faQuestionCircle } from "@fortawesome/pro-regular-svg-icons/faQuestionCircle";
import { faCaretDown } from "@fortawesome/pro-regular-svg-icons/faCaretDown";
import { faEye } from "@fortawesome/pro-regular-svg-icons/faEye";
import { faEyeSlash } from "@fortawesome/pro-regular-svg-icons/faEyeSlash";
import { faAngleDown } from "@fortawesome/pro-regular-svg-icons/faAngleDown";
import { faTriangleExclamation } from "@fortawesome/pro-regular-svg-icons/faTriangleExclamation";
import { faAngleDoubleLeft } from "@fortawesome/pro-regular-svg-icons/faAngleDoubleLeft";
import { faAngleDoubleRight } from "@fortawesome/pro-regular-svg-icons/faAngleDoubleRight";
import { faAngleLeft } from "@fortawesome/pro-regular-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/pro-regular-svg-icons/faAngleRight";
import { faCog } from "@fortawesome/pro-regular-svg-icons/faCog";
import { faArrowLeft } from "@fortawesome/pro-regular-svg-icons/faArrowLeft";
import { faCaretRight } from "@fortawesome/pro-regular-svg-icons/faCaretRight";
import { faSave } from "@fortawesome/pro-regular-svg-icons/faSave";
import { faStar } from "@fortawesome/pro-regular-svg-icons/faStar";
import { faMountainSun } from "@fortawesome/pro-regular-svg-icons/faMountainSun";
import { faBars } from "@fortawesome/pro-regular-svg-icons/faBars";
import { faAngleUp } from "@fortawesome/pro-regular-svg-icons/faAngleUp";
import { faCheck } from "@fortawesome/pro-regular-svg-icons/faCheck";
import { faSort } from "@fortawesome/pro-regular-svg-icons/faSort";
import { faSortDown } from "@fortawesome/pro-regular-svg-icons/faSortDown";
import { faSortUp } from "@fortawesome/pro-regular-svg-icons/faSortUp";
import { faEraser } from "@fortawesome/pro-regular-svg-icons/faEraser";
import { faArrowLeftLong } from "@fortawesome/pro-regular-svg-icons/faArrowLeftLong";
import { faSearch } from "@fortawesome/pro-regular-svg-icons/faSearch";
import { faExternalLink } from "@fortawesome/pro-regular-svg-icons/faExternalLink";
import { faEdit } from "@fortawesome/pro-regular-svg-icons/faEdit";
import { faRefresh } from "@fortawesome/pro-regular-svg-icons/faRefresh";
import { faPlusCircle } from "@fortawesome/pro-regular-svg-icons/faPlusCircle";
import { faRedo } from "@fortawesome/pro-regular-svg-icons/faRedo";
import { faUpload } from "@fortawesome/pro-regular-svg-icons/faUpload";
import { faFileExcel } from "@fortawesome/pro-regular-svg-icons/faFileExcel";
import { faArrowRight } from "@fortawesome/pro-regular-svg-icons/faArrowRight";

EventEmitter.defaultMaxListeners = 0;

if (process.env["NODE_ENV"] === "production") {
  enableProdMode();
}

bootstrapApplication(AppPage, {
  providers: [
    provideZonelessChangeDetection(),

    provideSdAngular({
      clientName: "client-devtool",
      defaultTheme: "mobile",
      defaultDark: false,
      icons: {
        fallback: faQuestionCircle,

        caretDown: faCaretDown,
        eye: faEye,
        eyeSlash: faEyeSlash,
        angleDown: faAngleDown,
        triangleExclamation: faTriangleExclamation,
        angleDoubleLeft: faAngleDoubleLeft,
        angleDoubleRight: faAngleDoubleRight,
        angleLeft: faAngleLeft,
        angleRight: faAngleRight,
        cog: faCog,
        arrowLeft: faArrowLeft,
        caretRight: faCaretRight,
        save: faSave,
        star: faStar,
        mountainSun: faMountainSun,
        bars: faBars,
        angleUp: faAngleUp,

        check: faCheck,
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
        redo: faRedo,
        upload: faUpload,
        fileExcel: faFileExcel,

        arrowRight: faArrowRight,
      },
    }),

    provideAppInitializer(async () => {
      const _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

      return await _sdServiceClientFactory.connectAsync("MAIN", {
        host: process.env["NODE_ENV"] === "production" ? "dev.simplysm.co.kr" : "localhost",
        port: process.env["NODE_ENV"] === "production" ? 80 : 50580,
        ssl: false,
      });
    }),
  ],
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
