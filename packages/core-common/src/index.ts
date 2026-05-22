// @simplysm/core-common
// 공통 유틸리티 패키지

import "./extensions/arr-ext";
import "./extensions/set-ext";
import "./extensions/map-ext";

export * from "./env";

// arr-extension 재내보내기
export * from "./extensions/arr-ext";

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
export * from "./features/logger";
//#endregion

//#region utils (네임스페이스 내보내기)
export * as obj from "./utils/obj";
export * as str from "./utils/str";
export * as num from "./utils/num";
export * as bytes from "./utils/bytes";
export * as path from "./utils/path";
export * as json from "./utils/json";
export * as xml from "./utils/xml";
export * as wait from "./utils/wait";
export * as transfer from "./utils/transferable";
export * as err from "./utils/error";
export * as dt from "./utils/date-format";
export * as primitive from "./utils/primitive";
//#endregion

//#region utils (직접 내보내기)
export * from "./utils/template-strings";
export * from "./utils/zip";
//#endregion

//#region 타입 유틸리티
export * from "./common.types";
//#endregion
