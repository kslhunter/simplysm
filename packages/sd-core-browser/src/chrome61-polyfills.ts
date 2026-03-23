// =============================================================
// Chrome 61+ Polyfills
// core-js는 feature detection 기반 — 이미 지원하는 기능은 skip
// =============================================================

// -- ES2018 --
import "core-js/actual/promise/finally";

// -- ES2019 --
import "core-js/actual/array/flat";
import "core-js/actual/array/flat-map";
import "core-js/actual/object/from-entries";
import "core-js/actual/string/trim-start";
import "core-js/actual/string/trim-end";

// -- ES2020 --
import "core-js/actual/global-this";
import "core-js/actual/string/match-all";
import "core-js/actual/promise/all-settled";

// -- ES2021 --
import "core-js/actual/promise/any";
import "core-js/actual/aggregate-error";
import "core-js/actual/string/replace-all";
import "core-js/actual/weak-ref";
import "core-js/actual/finalization-registry";

// -- ES2022 --
import "core-js/actual/array/at";
import "core-js/actual/string/at";
import "core-js/actual/object/has-own";
import "core-js/actual/error/cause";

// -- Web APIs --
import "core-js/actual/queue-microtask";
import "core-js/actual/structured-clone";

// -- AbortController (Chrome 66+) --
import "abortcontroller-polyfill/dist/abortcontroller-polyfill-only";

// -- ResizeObserver (Chrome 64+) --
// 메인 엔트리 대신 dist ESM 빌드를 직접 import하여
// 패키지의 declare global 타입 선언이 DOM 내장 ResizeObserver 타입과 충돌하는 것을 방지
import ResizeObserverPolyfill from "resize-observer-polyfill/dist/ResizeObserver.es";

if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  Object.defineProperty(window, "ResizeObserver", {
    value: ResizeObserverPolyfill,
    writable: true,
    configurable: true,
  });
}
