// @simplysm/core-common
// 공통 유틸리티 패키지

import "./globals";
import "./extensions/arr-ext";
import "./extensions/set-ext";
import "./extensions/map-ext";

// arr-extension에서 타입만 re-export
export type { ArrayDiffsResult, ArrayDiffs2Result, TreeArray } from "./extensions/arr-ext";


//#region errors
export * from "./errors/sd-error";
export * from "./errors/argument-error";
export * from "./errors/not-implemented-error";
export * from "./errors/timeout-error";
//#endregion

//#region types
export * from "./types/uuid";
export * from "./types/lazy-gc-map";
export * from "./types/date-time";
export * from "./types/date-only";
export * from "./types/time";
//#endregion

//#region features
export * from "./features/debounce-queue";
export * from "./features/serial-queue";
export * from "./features/event-emitter";
//#endregion

//#region utils
export * from "./utils/date-format";
export * from "./utils/bytes";
export * from "./utils/json";
export * from "./utils/num";
export * from "./utils/obj";
export * from "./utils/primitive";
export * from "./utils/str";
export * from "./utils/template-strings";
export * from "./utils/transferable";
export * from "./utils/wait";
export * from "./utils/xml";
//#endregion

//#region zip
export * from "./zip/sd-zip";
//#endregion

//#region type utilities
export * from "./common.types";
//#endregion
