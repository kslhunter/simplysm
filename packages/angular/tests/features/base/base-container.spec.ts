import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { SdAppStructureProvider } from "../../../src/core/providers/sd-app-structure.provider";
import { SdActivatedModalProvider } from "../../../src/core/providers/sd-activated-modal.provider";
import { BCTestHost } from "./sd-base-container-test.fixture";

function createMockAppStructure() {
  return {
    items: [],
    usableModules: () => undefined,
    permRecord: () => undefined,
    getTitleByFullCode: vi.fn().mockReturnValue("구조 제목"),
    getPermsByFullCode: vi.fn().mockReturnValue([]),
  };
}

function setupTestBed(extraProviders: object[] = []) {
  TestBed.configureTestingModule({
    imports: [BCTestHost],
    providers: [
      { provide: SdAppStructureProvider, useValue: createMockAppStructure() },
      { provide: Router, useValue: { events: new Subject(), url: "/app/test" } },
      ...extraProviders,
    ],
  });
}

function createFixture() {
  const fixture = TestBed.createComponent(BCTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function queryEl(fixture: ReturnType<typeof createFixture>, selector: string): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector(selector);
}

function queryText(fixture: ReturnType<typeof createFixture>): string {
  return (fixture.nativeElement as HTMLElement).textContent.trim();
}

describe("Feature 7.1 Slice 2: SdBaseContainerControl", () => {
  describe("Rule: 뷰 타입별 레이아웃 렌더링", () => {
    it("page 뷰 타입일 때 topbar-container 안에 topbar와 content가 표시된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, "sd-topbar-container")).not.toBeNull();
      expect(queryEl(fixture, "sd-topbar")).not.toBeNull();
      expect(queryEl(fixture, ".test-content")).not.toBeNull();
      expect(queryEl(fixture, ".test-topbar-extra")).not.toBeNull();
    });

    it("modal 뷰 타입일 때 flex-column 레이아웃으로 content와 하단 영역이 표시된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("modal");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, "sd-topbar-container")).toBeNull();
      expect(queryEl(fixture, ".flex-column")).not.toBeNull();
      expect(queryEl(fixture, ".test-content")).not.toBeNull();
      expect(queryEl(fixture, ".test-modal-bottom")).not.toBeNull();
    });

    it("control 뷰 타입일 때 content만 표시된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("control");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, "sd-topbar-container")).toBeNull();
      expect(queryEl(fixture, ".flex-column")).toBeNull();
      expect(queryEl(fixture, ".test-content")).not.toBeNull();
    });

    it("viewType 입력이 부모 추론보다 우선한다", () => {
      setupTestBed();
      const fixture = createFixture();
      // 부모 추론은 "control" (BCTestHost는 라우트/모달이 아님)
      // viewType 입력으로 "modal" 강제
      fixture.componentInstance.viewType.set("modal");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, ".flex-column")).not.toBeNull();
    });
  });

  describe("Rule: 권한 제한 시 접근 차단 UI 표시", () => {
    it("restricted=true일 때 권한 없음 안내가 표시된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.componentInstance.restricted.set(true);
      fixture.detectChanges();
      TestBed.flushEffects();

      const text = queryText(fixture);
      expect(text).toContain("사용권한이 없습니다");
      expect(queryEl(fixture, ".test-content")).toBeNull();
    });

    it("restricted=false일 때 정상 렌더링된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.componentInstance.restricted.set(false);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryText(fixture)).not.toContain("사용권한이 없습니다");
      expect(queryEl(fixture, ".test-content")).not.toBeNull();
    });
  });

  describe("Rule: 타이틀 결정 우선순위", () => {
    it("header 입력이 지정되면 header가 타이틀로 사용된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.componentInstance.header.set("커스텀 제목");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryText(fixture)).toContain("커스텀 제목");
    });

    it("header 미지정이고 모달 컨텍스트이면 모달 제목이 사용된다", () => {
      const mockModal = new SdActivatedModalProvider();
      mockModal.modalComponent.set({ title: () => "모달 제목" });
      setupTestBed([{ provide: SdActivatedModalProvider, useValue: mockModal }]);

      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryText(fixture)).toContain("모달 제목");
    });

    it("header 미지정이고 페이지 컨텍스트이면 앱 구조에서 제목을 가져온다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("page");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryText(fixture)).toContain("구조 제목");
    });
  });

  describe("Rule: 초기화 상태에 따른 컨텐츠 표시 제어", () => {
    it("initialized 미지정(undefined)이면 정상 렌더링된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("control");
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, ".test-content")).not.toBeNull();
    });

    it("initialized=true이면 정상 렌더링된다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("control");
      fixture.componentInstance.initialized.set(true);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, ".test-content")).not.toBeNull();
    });

    it("initialized=false이면 컨텐츠가 숨겨진다", () => {
      setupTestBed();
      const fixture = createFixture();
      fixture.componentInstance.viewType.set("control");
      fixture.componentInstance.initialized.set(false);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(queryEl(fixture, ".test-content")).toBeNull();
    });
  });
});
