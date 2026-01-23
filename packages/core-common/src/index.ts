// @simplysm/core-common
// 공통 유틸리티 패키지

import "./globals.d.ts";

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

//#region utils
export * from "./utils/date-format";
export * from "./utils/object";
export * from "./utils/string";
export * from "./utils/number";
export * from "./utils/json";
export * from "./utils/xml";
export * from "./utils/wait";
export * from "./utils/debounce-queue";
export * from "./utils/serial-queue";
export * from "./utils/transferable";
export * from "./utils/template-strings";
export * from "./utils/bytes-utils";
export * from "./utils/sd-event-emitter";
//#endregion

//#region extensions
// side-effect: Map 프로토타입 확장 (export 없음)
import "./extensions/map-ext";
// side-effect: Set 프로토타입 확장 (export 없음)
import "./extensions/set-ext";
// side-effect: Array 프로토타입 확장 + 타입 export
import "./extensions/array-ext";
export * from "./extensions/array-ext";
//#endregion

//#region zip
export * from "./zip/sd-zip";
//#endregion

//#region type utilities
export * from "./common.types";
//#endregion
