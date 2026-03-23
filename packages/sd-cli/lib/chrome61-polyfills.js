// =============================================================
// Chrome 61+ Polyfills
// core-js는 feature detection 기반 — 이미 지원하는 기능은 skip
// sd-cli가 Angular 클라이언트 빌드 시 자동 주입
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
import ResizeObserver from "resize-observer-polyfill";
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  window.ResizeObserver = ResizeObserver;
}
