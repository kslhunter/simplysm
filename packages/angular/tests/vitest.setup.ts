import { getTestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";
import { beforeEach } from "vitest";

const testBed = getTestBed();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

beforeEach(() => {
  testBed.resetTestingModule();
});
