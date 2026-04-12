import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import {
  IPParentUntyped,
  IPChildUntyped,
  IPGrandparent,
  IPChildTyped,
  IPGrandparentBase,
  IPParentOptional,
  IPChildOptional,
  IPParentError,
  IPChildError,
} from "./inject-parent-test.fixture";

describe("Feature 7.1 Slice 1: injectParent 유틸리티", () => {
  describe("Rule: injectParent 유틸리티", () => {
    it("타입 없이 호출하면 가장 가까운 부모 컴포넌트 인스턴스를 반환한다", () => {
      TestBed.configureTestingModule({ imports: [IPParentUntyped] });
      const fixture = TestBed.createComponent(IPParentUntyped);
      fixture.detectChanges();

      const child = fixture.debugElement.query(By.directive(IPChildUntyped))
        .componentInstance as IPChildUntyped;

      expect(child.parent).toBeInstanceOf(IPParentUntyped);
    });

    it("특정 타입으로 호출하면 해당 타입의 부모를 찾을 때까지 트리를 순회한다", () => {
      TestBed.configureTestingModule({ imports: [IPGrandparent] });
      const fixture = TestBed.createComponent(IPGrandparent);
      fixture.detectChanges();

      const child = fixture.debugElement.query(By.directive(IPChildTyped))
        .componentInstance as IPChildTyped;

      expect(child.grandparent).toBeInstanceOf(IPGrandparentBase);
      expect(child.grandparent).toBeInstanceOf(IPGrandparent);
    });

    it("optional=true이고 해당 타입 부모가 없으면 undefined를 반환한다", () => {
      TestBed.configureTestingModule({ imports: [IPParentOptional] });
      const fixture = TestBed.createComponent(IPParentOptional);
      fixture.detectChanges();

      const child = fixture.debugElement.query(By.directive(IPChildOptional))
        .componentInstance as IPChildOptional;

      expect(child.result).toBeUndefined();
    });

    it("optional 미지정이고 해당 타입 부모가 없으면 에러가 발생한다", () => {
      TestBed.configureTestingModule({ imports: [IPParentError] });
      const fixture = TestBed.createComponent(IPParentError);
      fixture.detectChanges();

      const child = fixture.debugElement.query(By.directive(IPChildError))
        .componentInstance as IPChildError;

      expect(child.error).toBeDefined();
      expect(child.error!.message).toBe("부모 컴포넌트를 찾을 수 없습니다.");
    });
  });
});
