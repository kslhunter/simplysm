import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../../src/core/plugins/events/sd-option-event.plugin";
import {
  SdSheetConfigBarKeyTest,
  SdSheetConfigBarPageTest,
  SdSheetNoConfigBarTest,
  SdSheetHideConfigBarTest,
} from "./sd-sheet-edit-test.fixture";

async function stableFixture<T>(component: new (...args: any[]) => T) {
  const fixture = TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    ],
  }).createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe("Feature 6.2 Slice 3: config bar", () => {
  it("Scenario: key 설정 시 설정 버튼 표시", async () => {
    const fixture = await stableFixture(SdSheetConfigBarKeyTest);
    const host = fixture.nativeElement as HTMLElement;

    const toolBar = host.querySelector("._tool");
    expect(toolBar).toBeTruthy();

    const settingsBtn = toolBar!.querySelector("sd-button");
    expect(settingsBtn).toBeTruthy();
  });

  it("Scenario: 페이지네이션이 config bar에 표시", async () => {
    const fixture = await stableFixture(SdSheetConfigBarPageTest);
    const host = fixture.nativeElement as HTMLElement;

    const toolBar = host.querySelector("._tool");
    expect(toolBar).toBeTruthy();

    const pagination = toolBar!.querySelector("sd-pagination");
    expect(pagination).toBeTruthy();
  });

  it("Scenario: key도 없고 페이지네이션도 불필요하면 config bar 미표시", async () => {
    const fixture = await stableFixture(SdSheetNoConfigBarTest);
    const host = fixture.nativeElement as HTMLElement;

    const toolBar = host.querySelector("._tool");
    expect(toolBar).toBeFalsy();
  });

  it("Scenario: hideConfigBar로 config bar 숨김", async () => {
    const fixture = await stableFixture(SdSheetHideConfigBarTest);
    const host = fixture.nativeElement as HTMLElement;

    const toolBar = host.querySelector("._tool");
    expect(toolBar).toBeFalsy();
  });
});
