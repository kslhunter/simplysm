import { Component } from "@angular/core";
import { injectParent } from "../../../src/core/utils/injectParent";

// typed 호출 테스트를 위한 추상 클래스 (forward reference 회피)
export abstract class IPGrandparentBase {}

// Scenario: 타입 없이 호출
@Component({ selector: "ip-child-untyped", template: "", standalone: true })
export class IPChildUntyped {
  parent = injectParent();
}

@Component({
  selector: "ip-parent-untyped",
  template: "<ip-child-untyped />",
  standalone: true,
  imports: [IPChildUntyped],
})
export class IPParentUntyped {}

// Scenario: 특정 타입으로 호출 (3-level 계층)
@Component({ selector: "ip-child-typed", template: "", standalone: true })
export class IPChildTyped {
  grandparent = injectParent(IPGrandparentBase);
}

@Component({
  selector: "ip-middle",
  template: "<ip-child-typed />",
  standalone: true,
  imports: [IPChildTyped],
})
export class IPMiddle {}

@Component({
  selector: "ip-grandparent",
  template: "<ip-middle />",
  standalone: true,
  imports: [IPMiddle],
})
export class IPGrandparent extends IPGrandparentBase {}

// Scenario: optional + 부모 없음
export abstract class IPUnknownType {}

@Component({ selector: "ip-child-optional", template: "", standalone: true })
export class IPChildOptional {
  result = injectParent(IPUnknownType, { optional: true });
}

@Component({
  selector: "ip-parent-optional",
  template: "<ip-child-optional />",
  standalone: true,
  imports: [IPChildOptional],
})
export class IPParentOptional {}

// Scenario: optional 미지정 + 부모 없음 → 에러
@Component({ selector: "ip-child-error", template: "", standalone: true })
export class IPChildError {
  error: Error | undefined;

  constructor() {
    try {
      injectParent(IPUnknownType);
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e));
    }
  }
}

@Component({
  selector: "ip-parent-error",
  template: "<ip-child-error />",
  standalone: true,
  imports: [IPChildError],
})
export class IPParentError {}
