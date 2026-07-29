import "@simplysm/core-common";
import { getTestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";
import { beforeEach } from "vitest";
import globalCssText from "../scss/styles.scss?inline";

// 소비자 앱은 항상 이 전역 스타일을 로드한다. 없으면 box-sizing, --sd-* 토큰, 기준 폰트 크기가
// 실제와 달라져 레이아웃 결함이 테스트에서 재현되지 않는다.
const globalStyleEl = document.createElement("style");
globalStyleEl.textContent = globalCssText;
document.head.appendChild(globalStyleEl);

const testBed = getTestBed();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

beforeEach(() => {
  testBed.resetTestingModule();
});
